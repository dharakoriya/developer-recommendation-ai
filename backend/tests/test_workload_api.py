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


def get_token(client, email, password, role="DEVELOPER", name="Test User"):
    client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "role": role},
    )
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def create_project(client, token, name="Workload Project"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/projects", json={"name": name, "status": "ACTIVE"}, headers=headers)
    return res.json()


def create_dev_profile(client, token, user_id, availability="AVAILABLE"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        "/api/developers",
        json={
            "user_id": user_id,
            "experience_years": 4.0,
            "availability_status": availability,
            "performance_score": 85.0,
        },
        headers=headers,
    )
    return res.json()


def create_task(client, token, project_id, title="Workload Task", hours=10.0, complexity="MEDIUM"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"/api/projects/{project_id}/tasks",
        json={
            "title": title,
            "estimated_hours": hours,
            "complexity": complexity,
            "priority": "MEDIUM",
            "status": "TODO",
        },
        headers=headers,
    )
    return res.json()


def assign_task(client, token, task_id, dev_profile_id):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        f"/api/tasks/{task_id}/assign",
        json={"developer_id": dev_profile_id, "force_override": True, "override_reason": "Test override"},
        headers=headers,
    )
    return res.json()


# --- WORKLOAD CALCULATION & API TESTS ---

def test_zero_workload_developer(client):
    mgr_token = get_token(client, "mgr_wl1@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    client.post("/api/auth/register", json={"name": "Idle Dev", "email": "idle@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev = client.post("/api/auth/login", json={"email": "idle@d.ai", "password": "pass"}).json()["user"]
    p_dev = create_dev_profile(client, mgr_token, u_dev["id"])

    # Query workload details for idle developer
    res = client.get(f"/api/workload/developers/{p_dev['id']}", headers=mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["active_task_count"] == 0
    assert float(data["total_estimated_hours"]) == 0.0
    assert float(data["workload_score"]) == 0.0
    assert data["workload_status"] == "AVAILABLE"


def test_workload_with_active_assignments_and_complexity(client):
    mgr_token = get_token(client, "mgr_wl2@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    client.post("/api/auth/register", json={"name": "Active Dev", "email": "act@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev = client.post("/api/auth/login", json={"email": "act@d.ai", "password": "pass"}).json()["user"]
    p_dev = create_dev_profile(client, mgr_token, u_dev["id"], availability="AVAILABLE")

    proj = create_project(client, mgr_token, "Workload Proj")

    # Task 1: 10 hrs, LOW complexity (10 * 1.0 = 10.0)
    t1 = create_task(client, mgr_token, proj["id"], title="T1", hours=10.0, complexity="LOW")
    assign_task(client, mgr_token, t1["id"], p_dev["id"])

    # Task 2: 20 hrs, HIGH complexity (20 * 1.3 = 26.0)
    t2 = create_task(client, mgr_token, proj["id"], title="T2", hours=20.0, complexity="HIGH")
    assign_task(client, mgr_token, t2["id"], p_dev["id"])

    # Total estimated hours = 30.0, weighted hours = 36.0
    # Capacity = 40.0, Workload score = (36.0 / 40.0) * 100 = 90.0% -> HIGH status
    res = client.get(f"/api/workload/developers/{p_dev['id']}", headers=mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["active_task_count"] == 2
    assert float(data["total_estimated_hours"]) == 30.0
    assert float(data["weighted_hours"]) == 36.0
    assert float(data["capacity_hours"]) == 40.0
    assert float(data["workload_score"]) == 90.0
    assert data["workload_status"] == "HIGH"


def test_overloaded_workload_and_availability_factor(client):
    mgr_token = get_token(client, "mgr_wl3@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    client.post("/api/auth/register", json={"name": "Part Dev", "email": "part@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev = client.post("/api/auth/login", json={"email": "part@d.ai", "password": "pass"}).json()["user"]
    p_dev = create_dev_profile(client, mgr_token, u_dev["id"], availability="PARTIAL") # Capacity = 20.0h

    proj = create_project(client, mgr_token, "Overload Proj")

    # Task: 25 hrs, MEDIUM complexity (25 * 1.15 = 28.75)
    t = create_task(client, mgr_token, proj["id"], title="Heavy Task", hours=25.0, complexity="MEDIUM")
    assign_task(client, mgr_token, t["id"], p_dev["id"])

    # Workload score = (28.75 / 20.0) * 100 = 143.75% -> OVERLOADED
    res = client.get(f"/api/workload/developers/{p_dev['id']}", headers=mgr_headers)
    assert res.status_code == 200
    data = res.json()
    assert float(data["capacity_hours"]) == 20.0
    assert float(data["workload_score"]) == 143.75
    assert data["workload_status"] == "OVERLOADED"


def test_historical_assignment_filtering(client):
    mgr_token = get_token(client, "mgr_wl4@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    client.post("/api/auth/register", json={"name": "Dev One", "email": "dev1@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev1 = client.post("/api/auth/login", json={"email": "dev1@d.ai", "password": "pass"}).json()["user"]
    p_dev1 = create_dev_profile(client, mgr_token, u_dev1["id"])

    client.post("/api/auth/register", json={"name": "Dev Two", "email": "dev2@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev2 = client.post("/api/auth/login", json={"email": "dev2@d.ai", "password": "pass"}).json()["user"]
    p_dev2 = create_dev_profile(client, mgr_token, u_dev2["id"])

    proj = create_project(client, mgr_token, "Reassign Proj")

    t1 = create_task(client, mgr_token, proj["id"], hours=16.0)
    a1 = assign_task(client, mgr_token, t1["id"], p_dev1["id"])

    # Dev1 initially has 16 hrs
    res1 = client.get(f"/api/workload/developers/{p_dev1['id']}", headers=mgr_headers).json()
    assert res1["active_task_count"] == 1

    # Reassign t1 to Dev2
    a2 = assign_task(client, mgr_token, t1["id"], p_dev2["id"])

    # Dev1 active task count should drop to 0, status AVAILABLE (previous REASSIGNED record is filtered out)
    res1_after = client.get(f"/api/workload/developers/{p_dev1['id']}", headers=mgr_headers).json()
    assert res1_after["active_task_count"] == 0
    assert float(res1_after["workload_score"]) == 0.0

    # Dev2 should now have active task
    res2 = client.get(f"/api/workload/developers/{p_dev2['id']}", headers=mgr_headers).json()
    assert res2["active_task_count"] == 1

    # Complete assignment for Dev2 -> Dev2 active workload becomes 0
    client.post(f"/api/assignments/{a2['id']}/complete", headers=mgr_headers)
    res2_comp = client.get(f"/api/workload/developers/{p_dev2['id']}", headers=mgr_headers).json()
    assert res2_comp["active_task_count"] == 0
    assert float(res2_comp["workload_score"]) == 0.0


def test_workload_snapshots_and_history(client):
    mgr_token = get_token(client, "mgr_wl5@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    client.post("/api/auth/register", json={"name": "Snap Dev", "email": "snap@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_dev = client.post("/api/auth/login", json={"email": "snap@d.ai", "password": "pass"}).json()["user"]
    p_dev = create_dev_profile(client, mgr_token, u_dev["id"])

    proj = create_project(client, mgr_token, "Snap Proj")
    t = create_task(client, mgr_token, proj["id"], hours=20.0, complexity="MEDIUM")
    assign_task(client, mgr_token, t["id"], p_dev["id"])

    # Take Snapshot 1
    snap1 = client.post(f"/api/workload/developers/{p_dev['id']}/snapshot", headers=mgr_headers)
    assert snap1.status_code == 201
    d1 = snap1.json()
    assert float(d1["estimated_hours"]) == 20.0

    # Add another task
    t2 = create_task(client, mgr_token, proj["id"], hours=15.0, complexity="LOW")
    assign_task(client, mgr_token, t2["id"], p_dev["id"])

    # Take Snapshot 2
    snap2 = client.post(f"/api/workload/developers/{p_dev['id']}/snapshot", headers=mgr_headers)
    assert snap2.status_code == 201
    d2 = snap2.json()
    assert float(d2["estimated_hours"]) == 35.0

    # Retrieve history
    hist_res = client.get(f"/api/workload/developers/{p_dev['id']}/history", headers=mgr_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2


def test_workload_authorization(client):
    mgr_token = get_token(client, "mgr_wl6@d.ai", "pass123", role="MANAGER")
    dev1_token = get_token(client, "dev1_wl@d.ai", "pass123", role="DEVELOPER", name="Dev One")
    dev2_token = get_token(client, "dev2_wl@d.ai", "pass123", role="DEVELOPER", name="Dev Two")

    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev1_headers = {"Authorization": f"Bearer {dev1_token}"}
    dev2_headers = {"Authorization": f"Bearer {dev2_token}"}

    u_dev1 = client.get("/api/auth/me", headers=dev1_headers).json()
    p_dev1 = create_dev_profile(client, mgr_token, u_dev1["id"])

    u_dev2 = client.get("/api/auth/me", headers=dev2_headers).json()
    p_dev2 = create_dev_profile(client, mgr_token, u_dev2["id"])

    # Dev1 can access own workload detail
    own_res = client.get(f"/api/workload/developers/{p_dev1['id']}", headers=dev1_headers)
    assert own_res.status_code == 200

    # Dev1 cannot access Dev2 workload detail -> 403 Forbidden
    other_res = client.get(f"/api/workload/developers/{p_dev2['id']}", headers=dev1_headers)
    assert other_res.status_code == 403

    # Dev1 cannot trigger snapshot creation -> 403 Forbidden
    snap_res = client.post(f"/api/workload/developers/{p_dev1['id']}/snapshot", headers=dev1_headers)
    assert snap_res.status_code == 403
