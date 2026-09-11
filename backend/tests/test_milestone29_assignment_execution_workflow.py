import uuid
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole, TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus
from app.core.security import create_access_token

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


def get_user_token(client, email, password, role="DEVELOPER", name="Test User"):
    client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "role": role},
    )
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    data = res.json()
    return data["access_token"], data["user"]


def create_project(client, token, name="Test Project M29"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/projects", json={"name": name, "status": "ACTIVE"}, headers=headers)
    return res.json()


def create_dev_profile(client, token, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        "/api/developers",
        json={
            "user_id": user_id,
            "experience_years": 5.0,
            "availability_status": "AVAILABLE",
            "performance_score": 85.0,
        },
        headers=headers,
    )
    return res.json()


def test_assignment_persistence_and_response_consistency(client):
    mgr_token, mgr_user = get_user_token(client, "mgr_m29@d.ai", "pass123", role="MANAGER", name="Mgr M29")
    dev_token, dev_user = get_user_token(client, "dev_m29@d.ai", "pass123", role="DEVELOPER", name="Dev M29")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    dev_prof = create_dev_profile(client, mgr_token, dev_user["id"])
    proj = create_project(client, mgr_token, "M29 Proj")

    # 1. Create Task (Unassigned, status=TODO)
    task_res = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={
            "title": "Build Auth Feature",
            "priority": "HIGH",
            "complexity": "MEDIUM",
            "estimated_hours": 12.0,
            "status": "TODO",
        },
        headers=mgr_headers,
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    task_id = task_data["id"]
    assert task_data["assigned_developer_id"] is None
    assert task_data["assigned_developer_name"] is None

    # 2. Assign Developer
    assign_res = client.post(
        f"/api/tasks/{task_id}/assign",
        json={"developer_id": dev_prof["id"], "selection_reason": "Top skill match"},
        headers=mgr_headers,
    )
    assert assign_res.status_code == 201
    assert assign_res.json()["status"] == "ACTIVE"

    # 3. Verify single source of truth across Task APIs
    get_task_res = client.get(f"/api/tasks/{task_id}", headers=dev_headers)
    assert get_task_res.status_code == 200
    t_detail = get_task_res.json()
    assert t_detail["status"] == "ASSIGNED"
    assert t_detail["assigned_developer_id"] == dev_prof["id"]
    assert t_detail["assigned_developer_name"] == "Dev M29"
    assert t_detail["current_assignment"] is not None
    assert t_detail["current_assignment"]["developer_id"] == dev_prof["id"]

    # 4. Verify Tasks List API also returns assigned developer info
    list_res = client.get("/api/tasks", headers=dev_headers)
    assert list_res.status_code == 200
    matched = next(t for t in list_res.json() if t["id"] == task_id)
    assert matched["assigned_developer_name"] == "Dev M29"


def test_task_execution_time_tracking_lifecycle(client):
    mgr_token, mgr_user = get_user_token(client, "mgr_exec@d.ai", "pass123", role="MANAGER")
    dev_token, dev_user = get_user_token(client, "dev_exec@d.ai", "pass123", role="DEVELOPER", name="Exec Dev")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    dev_prof = create_dev_profile(client, mgr_token, dev_user["id"])
    proj = create_project(client, mgr_token, "Execution Proj")

    # Create & Assign Task
    task = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "Dashboard Optimization", "estimated_hours": 10.0, "status": "TODO"},
        headers=mgr_headers,
    ).json()
    t_id = task["id"]

    client.post(f"/api/tasks/{t_id}/assign", json={"developer_id": dev_prof["id"]}, headers=mgr_headers)

    # 1. Developer starts task execution
    start_res = client.post(f"/api/tasks/{t_id}/start", headers=dev_headers)
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "IN_PROGRESS"
    assert start_data["is_timer_running"] is True
    assert start_data["started_at"] is not None

    # 2. Developer pauses task execution
    pause_res = client.post(f"/api/tasks/{t_id}/pause", headers=dev_headers)
    assert pause_res.status_code == 200
    pause_data = pause_res.json()
    assert pause_data["is_timer_running"] is False

    # 3. Developer completes task execution
    stop_res = client.post(f"/api/tasks/{t_id}/stop", headers=dev_headers)
    assert stop_res.status_code == 200
    stop_data = stop_res.json()
    assert stop_data["status"] == "COMPLETED"
    assert stop_data["completed_at"] is not None
    assert stop_data["assignment_history"][0]["status"] == "COMPLETED"


def test_rbac_developer_isolation(client):
    mgr_token, mgr_user = get_user_token(client, "mgr_rbac@d.ai", "pass123", role="MANAGER")
    dev_token1, dev_user1 = get_user_token(client, "dev1_rbac@d.ai", "pass123", role="DEVELOPER", name="Dev One")
    dev_token2, dev_user2 = get_user_token(client, "dev2_rbac@d.ai", "pass123", role="DEVELOPER", name="Dev Two")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev1_headers = {"Authorization": f"Bearer {dev_token1}"}
    dev2_headers = {"Authorization": f"Bearer {dev_token2}"}

    dev_prof1 = create_dev_profile(client, mgr_token, dev_user1["id"])
    dev_prof2 = create_dev_profile(client, mgr_token, dev_user2["id"])
    proj = create_project(client, mgr_token, "RBAC Proj")

    task = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "RBAC Isolated Task", "estimated_hours": 8.0, "status": "TODO"},
        headers=mgr_headers,
    ).json()
    t_id = task["id"]

    # Developer 1 is assigned to task
    client.post(f"/api/tasks/{t_id}/assign", json={"developer_id": dev_prof1["id"]}, headers=mgr_headers)

    # Developer 1 CAN start task
    start_res = client.post(f"/api/tasks/{t_id}/start", headers=dev1_headers)
    assert start_res.status_code == 200

    # Developer 2 CANNOT start Developer 1's task -> 403 Forbidden
    unauth_start = client.post(f"/api/tasks/{t_id}/start", headers=dev2_headers)
    assert unauth_start.status_code == 403

    # Developer 1 CANNOT call recommendation ranking endpoint -> 403 Forbidden
    rec_res = client.get(f"/api/recommendations/tasks/{t_id}", headers=dev1_headers)
    assert rec_res.status_code == 403
