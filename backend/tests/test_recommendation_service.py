import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole, TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus, AvailabilityStatus

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True, scope="function")
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def get_token(client, email, password, role="MANAGER", name="Test Manager"):
    client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "role": role},
    )
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def setup_rec_test_env(client, mgr_token):
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Skills
    s1 = client.post("/api/skills", json={"name": "Python", "category": "Backend"}, headers=mgr_headers).json()
    s2 = client.post("/api/skills", json={"name": "React", "category": "Frontend"}, headers=mgr_headers).json()

    # Developer 1: High skill match, low workload
    client.post("/api/auth/register", json={"name": "Dev Expert", "email": "expert@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_exp = client.post("/api/auth/login", json={"email": "expert@d.ai", "password": "pass"}).json()["user"]
    p_exp = client.post("/api/developers", json={"user_id": u_exp["id"], "experience_years": 6.0, "availability_status": "AVAILABLE", "performance_score": 95.0}, headers=mgr_headers).json()
    client.post(f"/api/developers/{p_exp['id']}/skills", json={"skill_id": s1["id"], "proficiency_level": 90.0}, headers=mgr_headers)
    client.post(f"/api/developers/{p_exp['id']}/skills", json={"skill_id": s2["id"], "proficiency_level": 85.0}, headers=mgr_headers)

    # Developer 2: Low skill match
    client.post("/api/auth/register", json={"name": "Dev Novice", "email": "novice@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_nov = client.post("/api/auth/login", json={"email": "novice@d.ai", "password": "pass"}).json()["user"]
    p_nov = client.post("/api/developers", json={"user_id": u_nov["id"], "experience_years": 1.0, "availability_status": "AVAILABLE", "performance_score": 70.0}, headers=mgr_headers).json()
    client.post(f"/api/developers/{p_nov['id']}/skills", json={"skill_id": s1["id"], "proficiency_level": 40.0}, headers=mgr_headers)

    # Project & Task requiring Python 80, React 70
    proj = client.post("/api/projects", json={"name": "Rec Proj", "status": "ACTIVE"}, headers=mgr_headers).json()
    task = client.post(f"/api/projects/{proj['id']}/tasks", json={"title": "Fullstack Task", "estimated_hours": 10.0, "complexity": "MEDIUM"}, headers=mgr_headers).json()
    client.post(f"/api/tasks/{task['id']}/skills", json={"skill_id": s1["id"], "required_level": 80.0}, headers=mgr_headers)
    client.post(f"/api/tasks/{task['id']}/skills", json={"skill_id": s2["id"], "required_level": 70.0}, headers=mgr_headers)

    return p_exp, p_nov, task, s1, s2, proj


def test_model_metadata_endpoint(client):
    token = get_token(client, "usr_meta@d.ai", "pass123")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/recommendations/metadata/model", headers=headers)
    assert res.status_code == 200
    meta = res.json()
    assert meta["model_type"] == "deterministic_baseline"
    assert meta["model_version"] == "baseline-v1"
    assert meta["training_required"] is False


def test_task_recommendation_ranking_and_explanations(client):
    mgr_token = get_token(client, "mgr_rec1@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_exp, p_nov, task, s1, s2, proj = setup_rec_test_env(client, mgr_token)

    res = client.get(f"/api/recommendations/tasks/{task['id']}?regenerate=true", headers=mgr_headers)
    assert res.status_code == 200
    rec_data = res.json()

    assert rec_data["task_id"] == task["id"]
    assert rec_data["total_recommendations"] == 2
    recs = rec_data["recommendations"]

    # Rank 1 should be Dev Expert (higher score)
    assert recs[0]["rank"] == 1
    assert recs[0]["developer_id"] == p_exp["id"]
    assert recs[1]["rank"] == 2
    assert recs[1]["developer_id"] == p_nov["id"]
    assert recs[0]["score"] > recs[1]["score"]

    # Verify explanations sum equals total score
    exps = recs[0]["explanations"]
    assert len(exps) == 6
    contrib_sum = round(sum(e["contribution_score"] for e in exps), 2)
    assert abs(contrib_sum - recs[0]["score"]) < 0.01


def test_workload_influence_on_ranking(client):
    mgr_token = get_token(client, "mgr_rec2@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_exp, p_nov, task, s1, s2, proj = setup_rec_test_env(client, mgr_token)

    # Overload Dev Expert by assigning heavy tasks
    t_heavy = client.post(f"/api/projects/{proj['id']}/tasks", json={"title": "Heavy Task", "estimated_hours": 50.0, "complexity": "HIGH"}, headers=mgr_headers).json()
    client.post(f"/api/tasks/{t_heavy['id']}/assign", json={"developer_id": p_exp["id"]}, headers=mgr_headers)

    # Regenerate recommendations
    res = client.get(f"/api/recommendations/tasks/{task['id']}?regenerate=true", headers=mgr_headers)
    assert res.status_code == 200
    recs = res.json()["recommendations"]

    # Expert workload contribution should now be 0.0 because workload > 100%
    exp_rec = [r for r in recs if r["developer_id"] == p_exp["id"]][0]
    workload_exp = [e for e in exp_rec["explanations"] if e["feature_name"] == "dev_workload_score"][0]
    assert workload_exp["contribution_score"] == 0.0


def test_recommendation_determinism(client):
    mgr_token = get_token(client, "mgr_rec3@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_exp, p_nov, task, s1, s2, proj = setup_rec_test_env(client, mgr_token)

    # Call recommendation generator twice
    res1 = client.get(f"/api/recommendations/tasks/{task['id']}?regenerate=true", headers=mgr_headers).json()
    res2 = client.get(f"/api/recommendations/tasks/{task['id']}", headers=mgr_headers).json()

    assert res1["total_recommendations"] == res2["total_recommendations"]
    assert res1["recommendations"][0]["score"] == res2["recommendations"][0]["score"]
    assert res1["recommendations"][0]["developer_id"] == res2["recommendations"][0]["developer_id"]
