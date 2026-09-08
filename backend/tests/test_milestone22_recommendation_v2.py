import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.services.task_developer_compatibility_service import evaluate_task_developer_compatibility
from app.services.recommendation_service import (
    BaselineV2RecommendationModel,
)
from app.schemas.feature import CandidateFeatureVector

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
    res_reg = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "role": role},
    )
    assert res_reg.status_code == 201, f"Register failed: {res_reg.text}"
    res_login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    return res_login.json()["access_token"]


def make_test_feature_vector(**kwargs) -> CandidateFeatureVector:
    defaults = {
        "developer_id": uuid.uuid4(),
        "user_name": "Test Dev",
        "user_email": "dev@test.com",
        "task_id": uuid.uuid4(),
        "task_title": "Test Task",
        "project_id": uuid.uuid4(),
        "project_name": "Test Project",
        "dev_experience_years": 5.0,
        "dev_availability_status": "AVAILABLE",
        "dev_availability_encoded": 1.0,
        "dev_performance_score": 90.0,
        "dev_total_skills_count": 5,
        "dev_workload_score": 10.0,
        "dev_capacity_hours": 40.0,
        "dev_active_task_count": 1,
        "dev_workload_status": "AVAILABLE",
        "dev_workload_status_encoded": 0,
        "task_estimated_hours": 10.0,
        "task_complexity": "MEDIUM",
        "task_complexity_encoded": 2,
        "task_priority": "MEDIUM",
        "task_priority_encoded": 2,
        "task_status": "TODO",
        "task_required_skill_count": 2,
        "task_weight_score": 50.0,
        "matching_skill_count": 2,
        "skill_coverage_ratio": 1.0,
        "avg_required_level": 70.0,
        "avg_developer_level": 85.0,
        "avg_proficiency_gap": 15.0,
        "min_proficiency_gap": 10.0,
        "weighted_skill_match_score": 85.0,
        "is_historically_assigned": 0,
    }
    defaults.update(kwargs)
    return CandidateFeatureVector(**defaults)


def test_baseline_v2_model_metadata():
    model = BaselineV2RecommendationModel()
    meta = model.get_model_metadata()
    assert meta.model_version == "baseline-v2"
    assert meta.model_type == "deterministic_baseline"
    assert meta.description is not None


def test_compatibility_scoring_7_factors():
    model = BaselineV2RecommendationModel()
    # Fully qualified candidate
    vec_perfect = make_test_feature_vector(
        dev_experience_years=5.0,
        dev_availability_status="AVAILABLE",
        dev_performance_score=90.0,
        dev_workload_score=10.0,
        dev_active_task_count=1,
        weighted_skill_match_score=100.0,
        skill_coverage_ratio=1.0,
    )
    score_perfect, cont_perfect, status_perfect, reasons_perfect = model.predict_candidate_score(
        vec_perfect, task_weight_score=80.0
    )
    assert score_perfect >= 75.0
    assert status_perfect == "ELIGIBLE"
    assert len(reasons_perfect) == 0

    # Ineligible candidate (missing skills & unavailable)
    vec_ineligible = make_test_feature_vector(
        dev_experience_years=1.0,
        dev_availability_status="UNAVAILABLE",
        dev_performance_score=50.0,
        dev_workload_score=140.0,
        dev_active_task_count=4,
        weighted_skill_match_score=0.0,
        skill_coverage_ratio=0.0,
        matching_skill_count=0,
    )
    score_ineligible, cont_ineligible, status_ineligible, reasons_ineligible = model.predict_candidate_score(
        vec_ineligible, task_weight_score=85.0
    )
    assert status_ineligible == "INELIGIBLE"
    assert len(reasons_ineligible) >= 2
    assert any("Missing" in r for r in reasons_ineligible)
    assert any("Unavailable" in r for r in reasons_ineligible)


def test_anti_monopoly_workload_penalty():
    model = BaselineV2RecommendationModel()
    # Candidate A: Light workload
    vec_light = make_test_feature_vector(
        dev_workload_score=10.0,
        dev_active_task_count=1,
        weighted_skill_match_score=80.0,
        skill_coverage_ratio=1.0,
    )
    # Candidate B: Heavy workload (3 tasks, 90% load)
    vec_heavy = make_test_feature_vector(
        dev_workload_score=90.0,
        dev_active_task_count=3,
        weighted_skill_match_score=80.0,
        skill_coverage_ratio=1.0,
    )

    score_light, _, _, _ = model.predict_candidate_score(vec_light, task_weight_score=50.0)
    score_heavy, _, _, _ = model.predict_candidate_score(vec_heavy, task_weight_score=50.0)
    assert score_light > score_heavy


def test_task_weight_compatibility():
    model = BaselineV2RecommendationModel()
    # Critical task (weight = 90) given to junior vs senior
    vec_junior = make_test_feature_vector(
        dev_experience_years=1.0,
        dev_performance_score=50.0,
        weighted_skill_match_score=70.0,
        skill_coverage_ratio=1.0,
    )
    vec_senior = make_test_feature_vector(
        dev_experience_years=6.0,
        dev_performance_score=90.0,
        weighted_skill_match_score=70.0,
        skill_coverage_ratio=1.0,
    )

    score_junior, _, _, _ = model.predict_candidate_score(vec_junior, task_weight_score=90.0)
    score_senior, _, _, _ = model.predict_candidate_score(vec_senior, task_weight_score=90.0)
    assert score_senior > score_junior


def test_recommendation_api_rbac(client):
    mgr_token = get_token(client, "mgr_m22@test.com", "pass123", role="MANAGER", name="Manager M22")
    dev_token = get_token(client, "dev_m22@test.com", "pass123", role="DEVELOPER", name="Developer M22")

    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Setup Project & Task
    p_req = client.post("/api/projects", json={"name": "M22 Project"}, headers=mgr_headers)
    assert p_req.status_code == 201, f"Project creation failed: {p_req.text}"
    p_res = p_req.json()

    t_req = client.post(f"/api/projects/{p_res['id']}/tasks", json={"title": "M22 Task", "priority": "HIGH", "complexity": "HIGH", "estimated_hours": 10.0}, headers=mgr_headers)
    assert t_req.status_code == 201, f"Task creation failed: {t_req.text}"
    t_res = t_req.json()

    # Admin/Manager call -> 200 OK
    res_mgr = client.get(f"/api/recommendations/tasks/{t_res['id']}", headers=mgr_headers)
    assert res_mgr.status_code == 200
    data = res_mgr.json()
    assert data["model_version"] == "baseline-v2"
    assert "recommendations" in data
    assert "excluded_recommendations" in data

    # Developer call -> 403 Forbidden
    res_dev = client.get(f"/api/recommendations/tasks/{t_res['id']}", headers=dev_headers)
    assert res_dev.status_code == 403


def test_recommendation_invalidation(client):
    mgr_token = get_token(client, "mgr_inv@test.com", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    p_req = client.post("/api/projects", json={"name": "Inv Project"}, headers=mgr_headers)
    assert p_req.status_code == 201, f"Project creation failed: {p_req.text}"
    p_res = p_req.json()

    t_req = client.post(f"/api/projects/{p_res['id']}/tasks", json={"title": "Inv Task", "estimated_hours": 15.0}, headers=mgr_headers)
    assert t_req.status_code == 201, f"Task creation failed: {t_req.text}"
    t_res = t_req.json()

    # Generate initial recommendation
    res1 = client.get(f"/api/recommendations/tasks/{t_res['id']}", headers=mgr_headers)
    assert res1.status_code == 200
    assert res1.json()["freshness_status"] == "FRESH"

    # Update task -> triggers invalidation
    client.put(f"/api/tasks/{t_res['id']}", json={"priority": "URGENT"}, headers=mgr_headers)

    # Next fetch regenerates fresh recommendations
    res2 = client.get(f"/api/recommendations/tasks/{t_res['id']}", headers=mgr_headers)
    assert res2.status_code == 200
    assert res2.json()["freshness_status"] == "FRESH"
