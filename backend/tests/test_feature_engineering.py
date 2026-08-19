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


def setup_feature_test_environment(client, mgr_token):
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Create Skills
    s1 = client.post("/api/skills", json={"name": "Python", "category": "Backend"}, headers=mgr_headers).json()
    s2 = client.post("/api/skills", json={"name": "FastAPI", "category": "Backend"}, headers=mgr_headers).json()

    # Create Dev Profile
    client.post("/api/auth/register", json={"name": "Dev Alice", "email": "alice@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_alice = client.post("/api/auth/login", json={"email": "alice@d.ai", "password": "pass"}).json()["user"]

    p_alice = client.post(
        "/api/developers",
        json={
            "user_id": u_alice["id"],
            "experience_years": 5.0,
            "availability_status": "AVAILABLE",
            "performance_score": 90.0,
        },
        headers=mgr_headers,
    ).json()

    # Attach skills to Dev Alice (Python: 85, FastAPI: 60)
    client.post(f"/api/developers/{p_alice['id']}/skills", json={"skill_id": s1["id"], "proficiency_level": 85.0}, headers=mgr_headers)
    client.post(f"/api/developers/{p_alice['id']}/skills", json={"skill_id": s2["id"], "proficiency_level": 60.0}, headers=mgr_headers)

    # Create Project & Task
    proj = client.post("/api/projects", json={"name": "Feature Proj", "status": "ACTIVE"}, headers=mgr_headers).json()

    task = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={
            "title": "Build API",
            "estimated_hours": 16.0,
            "complexity": "HIGH",
            "priority": "HIGH",
            "status": "TODO",
        },
        headers=mgr_headers,
    ).json()

    # Add required skills to task (Python: req 80, FastAPI: req 70)
    client.post(f"/api/tasks/{task['id']}/skills", json={"skill_id": s1["id"], "required_level": 80.0}, headers=mgr_headers)
    client.post(f"/api/tasks/{task['id']}/skills", json={"skill_id": s2["id"], "required_level": 70.0}, headers=mgr_headers)

    return p_alice, task, s1, s2, proj


def test_feature_metadata_endpoint(client):
    token = get_token(client, "user_meta@d.ai", "pass123")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/features/metadata", headers=headers)
    assert res.status_code == 200
    meta = res.json()
    assert len(meta) >= 21
    feat_names = [f["feature_name"] for f in meta]
    assert "dev_experience_years" in feat_names
    assert "skill_coverage_ratio" in feat_names
    assert "dev_workload_score" in feat_names
    assert "label_target" in feat_names


def test_developer_task_pair_feature_extraction(client):
    mgr_token = get_token(client, "mgr_feat1@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_alice, task, s1, s2, proj = setup_feature_test_environment(client, mgr_token)

    res = client.get(f"/api/features/pair/{p_alice['id']}/{task['id']}", headers=mgr_headers)
    assert res.status_code == 200
    vec = res.json()

    assert vec["developer_id"] == p_alice["id"]
    assert vec["task_id"] == task["id"]
    assert vec["dev_experience_years"] == 5.0
    assert vec["dev_total_skills_count"] == 2
    assert vec["task_required_skill_count"] == 2
    assert vec["matching_skill_count"] == 2
    assert vec["skill_coverage_ratio"] == 1.0

    # Skill levels: Python (dev 85, req 80 -> gap +5), FastAPI (dev 60, req 70 -> gap -10)
    # avg_req_lvl = (80 + 70)/2 = 75.0
    # avg_dev_lvl = (85 + 60)/2 = 72.5
    # avg_gap = (5 + -10)/2 = -2.5
    # min_gap = -10.0
    assert vec["avg_required_level"] == 75.0
    assert vec["avg_developer_level"] == 72.5
    assert vec["avg_proficiency_gap"] == -2.5
    assert vec["min_proficiency_gap"] == -10.0
    assert vec["is_historically_assigned"] == 0
    assert vec["label_target"] is None


def test_workload_integration_in_features(client):
    mgr_token = get_token(client, "mgr_feat2@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_alice, task, s1, s2, proj = setup_feature_test_environment(client, mgr_token)

    # Assign task to Alice
    client.post(f"/api/tasks/{task['id']}/assign", json={"developer_id": p_alice["id"]}, headers=mgr_headers)

    # Extract features after assignment
    res = client.get(f"/api/features/pair/{p_alice['id']}/{task['id']}", headers=mgr_headers)
    assert res.status_code == 200
    vec = res.json()

    assert vec["dev_active_task_count"] == 1
    assert vec["dev_workload_score"] > 0.0  # Consumes WorkloadService calculation
    assert vec["is_historically_assigned"] == 1


def test_task_candidates_generation(client):
    mgr_token = get_token(client, "mgr_feat3@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_alice, task, s1, s2, proj = setup_feature_test_environment(client, mgr_token)

    res = client.get(f"/api/features/tasks/{task['id']}/candidates", headers=mgr_headers)
    assert res.status_code == 200
    cand_resp = res.json()

    assert cand_resp["task_id"] == task["id"]
    assert cand_resp["total_candidates"] >= 1
    assert len(cand_resp["candidates"]) == cand_resp["total_candidates"]


def test_dataset_export_csv_and_disclaimer(client):
    mgr_token = get_token(client, "mgr_feat4@d.ai", "pass123")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_alice, task, s1, s2, proj = setup_feature_test_environment(client, mgr_token)

    res = client.get("/api/features/dataset/export", headers=mgr_headers)
    assert res.status_code == 200
    exp = res.json()

    assert exp["total_rows"] >= 1
    assert "developer_id" in exp["columns"]
    assert "skill_coverage_ratio" in exp["columns"]
    assert "label_target" in exp["columns"]
    assert "label_target" in exp["csv_content"]
    assert "explicitly set to NULL" in exp["label_disclaimer"]


def test_dataset_export_authorization(client):
    mgr_token = get_token(client, "mgr_feat5@d.ai", "pass123", role="MANAGER")
    dev_token = get_token(client, "dev_feat5@d.ai", "pass123", role="DEVELOPER", name="Ordinary Dev")

    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # DEVELOPER cannot export CSV dataset -> 403 Forbidden
    res_dev = client.get("/api/features/dataset/export", headers=dev_headers)
    assert res_dev.status_code == 403

    # MANAGER can export CSV dataset
    res_mgr = client.get("/api/features/dataset/export", headers=mgr_headers)
    assert res_mgr.status_code == 200
