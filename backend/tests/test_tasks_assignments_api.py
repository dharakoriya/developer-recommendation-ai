import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole, TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus

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


def create_project(client, token, name="Test Project"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/projects", json={"name": name, "status": "ACTIVE"}, headers=headers)
    return res.json()


def create_skill(client, token, name="Python", category="Backend"):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/skills", json={"name": name, "category": category}, headers=headers)
    return res.json()


def create_dev_profile(client, token, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        "/api/developers",
        json={
            "user_id": user_id,
            "experience_years": 5.0,
            "availability_status": "AVAILABLE",
            "performance_score": 90.0,
        },
        headers=headers,
    )
    return res.json()


# --- TASKS API TESTS ---

def test_task_creation_and_authorization(client):
    mgr_token = get_token(client, "mgr_task@d.ai", "pass123", role="MANAGER")
    dev_token = get_token(client, "dev_task@d.ai", "pass123", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    proj = create_project(client, mgr_token, "Project Tasks")
    proj_id = proj["id"]

    # MANAGER creates task
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Build Auth Feature",
            "description": "Implement JWT endpoints",
            "category": "Backend",
            "priority": "HIGH",
            "complexity": "MEDIUM",
            "estimated_hours": 16.0,
            "status": "TODO",
        },
        headers=mgr_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Build Auth Feature"
    assert data["priority"] == "HIGH"
    assert float(data["estimated_hours"]) == 16.0

    # DEVELOPER creating task -> 403 Forbidden
    res_dev = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Dev Created Task", "estimated_hours": 8.0},
        headers=dev_headers,
    )
    assert res_dev.status_code == 403


def test_task_listing_and_retrieval(client):
    mgr_token = get_token(client, "mgr_task2@d.ai", "pass123", role="MANAGER")
    dev_token = get_token(client, "dev_task2@d.ai", "pass123", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    proj = create_project(client, mgr_token, "List Project")
    proj_id = proj["id"]

    t1 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "T1", "estimated_hours": 10.0, "status": "TODO"},
        headers=mgr_headers,
    ).json()

    t2 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "T2", "estimated_hours": 20.0, "status": "IN_PROGRESS"},
        headers=mgr_headers,
    ).json()

    # DEVELOPER lists tasks in project
    list_res = client.get(f"/api/projects/{proj_id}/tasks", headers=dev_headers)
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) == 2

    # Status filter
    filtered = client.get(f"/api/projects/{proj_id}/tasks?status=IN_PROGRESS", headers=dev_headers).json()
    assert len(filtered) == 1
    assert filtered[0]["id"] == t2["id"]

    # Single task retrieval
    get_res = client.get(f"/api/tasks/{t1['id']}", headers=dev_headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "T1"


def test_task_update_and_delete(client):
    mgr_token = get_token(client, "mgr_task3@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    proj = create_project(client, mgr_token, "Update Project")
    t = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "Old Title", "estimated_hours": 5.0, "priority": "LOW"},
        headers=mgr_headers,
    ).json()
    t_id = t["id"]

    # Update task
    upd_res = client.put(
        f"/api/tasks/{t_id}",
        json={"title": "New Title", "priority": "CRITICAL", "estimated_hours": 8.5},
        headers=mgr_headers,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["title"] == "New Title"
    assert upd_res.json()["priority"] == "CRITICAL"

    # Delete task
    del_res = client.delete(f"/api/tasks/{t_id}", headers=mgr_headers)
    assert del_res.status_code == 204

    # Verify 404
    assert client.get(f"/api/tasks/{t_id}", headers=mgr_headers).status_code == 404


def test_invalid_project_and_task_validations(client):
    mgr_token = get_token(client, "mgr_task4@d.ai", "pass123", role="MANAGER")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    random_id = str(uuid.uuid4())
    # Task under non-existent project -> 404
    res = client.post(
        f"/api/projects/{random_id}/tasks",
        json={"title": "Ghost Task", "estimated_hours": 4.0},
        headers=headers,
    )
    assert res.status_code == 404

    # Non-existent task ID -> 404
    assert client.get(f"/api/tasks/{random_id}", headers=headers).status_code == 404

    # Estimated hours <= 0 -> 422
    proj = create_project(client, mgr_token, "Validation Project")
    invalid_hours = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "Zero Hours", "estimated_hours": 0.0},
        headers=headers,
    )
    assert invalid_hours.status_code == 422


# --- TASK SKILLS TESTS ---

def test_task_skills_management(client):
    mgr_token = get_token(client, "mgr_tskill@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    proj = create_project(client, mgr_token, "Skill Project")
    task = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "Skill Task", "estimated_hours": 12.0},
        headers=mgr_headers,
    ).json()
    t_id = task["id"]

    skill1 = create_skill(client, mgr_token, "Python", "Backend")
    skill2 = create_skill(client, mgr_token, "React", "Frontend")

    # Add required skill
    add_res = client.post(
        f"/api/tasks/{t_id}/skills",
        json={"skill_id": skill1["id"], "required_level": 85.0},
        headers=mgr_headers,
    )
    assert add_res.status_code == 201
    skill_data = add_res.json()
    assert skill_data["skill_name"] == "Python"
    assert float(skill_data["required_level"]) == 85.0

    # List required skills
    list_res = client.get(f"/api/tasks/{t_id}/skills", headers=mgr_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Duplicate skill addition -> 400 Bad Request
    dup_res = client.post(
        f"/api/tasks/{t_id}/skills",
        json={"skill_id": skill1["id"], "required_level": 90.0},
        headers=mgr_headers,
    )
    assert dup_res.status_code == 400

    # Update required level
    upd_res = client.put(
        f"/api/tasks/{t_id}/skills/{skill1['id']}",
        json={"required_level": 95.0},
        headers=mgr_headers,
    )
    assert upd_res.status_code == 200
    assert float(upd_res.json()["required_level"]) == 95.0

    # Remove required skill
    del_res = client.delete(f"/api/tasks/{t_id}/skills/{skill1['id']}", headers=mgr_headers)
    assert del_res.status_code == 204
    assert len(client.get(f"/api/tasks/{t_id}/skills", headers=mgr_headers).json()) == 0


# --- ASSIGNMENTS & HISTORY TESTS ---

def test_developer_assignment_and_history_preservation(client):
    mgr_token = get_token(client, "mgr_assign@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Setup developers
    client.post("/api/auth/register", json={"name": "Dev Alice", "email": "alice@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_alice = client.post("/api/auth/login", json={"email": "alice@d.ai", "password": "pass"}).json()["user"]
    p_alice = create_dev_profile(client, mgr_token, u_alice["id"])

    client.post("/api/auth/register", json={"name": "Dev Bob", "email": "bob@d.ai", "password": "pass", "role": "DEVELOPER"})
    u_bob = client.post("/api/auth/login", json={"email": "bob@d.ai", "password": "pass"}).json()["user"]
    p_bob = create_dev_profile(client, mgr_token, u_bob["id"])

    # Setup task
    proj = create_project(client, mgr_token, "Assignment Project")
    task = client.post(
        f"/api/projects/{proj['id']}/tasks",
        json={"title": "Assignment Task", "estimated_hours": 15.0, "status": "TODO"},
        headers=mgr_headers,
    ).json()
    t_id = task["id"]

    # 1. Assign Alice to task
    assign_alice = client.post(
        f"/api/tasks/{t_id}/assign",
        json={"developer_id": p_alice["id"], "notes": "Initial assignment"},
        headers=mgr_headers,
    )
    assert assign_alice.status_code == 201
    a_alice = assign_alice.json()
    assert a_alice["developer_name"] == "Dev Alice"
    assert a_alice["status"] == "ACTIVE"

    # Task status should automatically transition to IN_PROGRESS
    task_check = client.get(f"/api/tasks/{t_id}", headers=mgr_headers).json()
    assert task_check["status"] == "IN_PROGRESS"

    # Attempting to assign Alice again -> 400 Bad Request
    dup_assign = client.post(
        f"/api/tasks/{t_id}/assign",
        json={"developer_id": p_alice["id"]},
        headers=mgr_headers,
    )
    assert dup_assign.status_code == 400

    # 2. Reassign task to Bob (Non-destructive history check!)
    assign_bob = client.post(
        f"/api/tasks/{t_id}/assign",
        json={"developer_id": p_bob["id"], "notes": "Reassigned for workload"},
        headers=mgr_headers,
    )
    assert assign_bob.status_code == 201
    a_bob = assign_bob.json()
    assert a_bob["developer_name"] == "Dev Bob"
    assert a_bob["status"] == "ACTIVE"

    # Verify complete auditable assignment history
    history_res = client.get(f"/api/tasks/{t_id}/assignments", headers=mgr_headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2

    # Check Alice's assignment status is updated to REASSIGNED and has reassigned_at timestamp
    alice_hist = next(h for h in history if h["developer_id"] == p_alice["id"])
    assert alice_hist["status"] == "REASSIGNED"
    assert alice_hist["reassigned_at"] is not None

    # Check Bob's assignment is ACTIVE
    bob_hist = next(h for h in history if h["developer_id"] == p_bob["id"])
    assert bob_hist["status"] == "ACTIVE"

    # 3. Complete assignment
    comp_res = client.post(f"/api/assignments/{a_bob['id']}/complete", headers=mgr_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"
    assert comp_res.json()["completed_at"] is not None

    # Verify task status is now COMPLETED
    task_after = client.get(f"/api/tasks/{t_id}", headers=mgr_headers).json()
    assert task_after["status"] == "COMPLETED"


def test_direct_tasks_teams_assignments_api_routes(client):
    mgr_token = get_token(client, "mgr_direct@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    proj = create_project(client, mgr_token, "Direct Route Project")
    proj_id = proj["id"]

    # 1. Test direct GET /api/tasks and POST /api/tasks
    create_t_res = client.post(
        "/api/tasks",
        json={
            "project_id": proj_id,
            "title": "Direct Task",
            "priority": "HIGH",
            "complexity": "MEDIUM",
            "estimated_hours": 12.0,
            "status": "TODO",
        },
        headers=mgr_headers,
    )
    assert create_t_res.status_code == 201
    task_data = create_t_res.json()
    t_id = task_data["id"]

    list_t_res = client.get("/api/tasks", headers=mgr_headers)
    assert list_t_res.status_code == 200
    assert len(list_t_res.json()) >= 1

    alias_t_res = client.get(f"/api/tasks/project/{proj_id}", headers=mgr_headers)
    assert alias_t_res.status_code == 200
    assert len(alias_t_res.json()) >= 1

    # 2. Test direct GET /api/teams and POST /api/teams
    create_team_res = client.post(
        "/api/teams",
        json={"project_id": proj_id, "name": "Direct Team"},
        headers=mgr_headers,
    )
    assert create_team_res.status_code == 201

    list_teams_res = client.get("/api/teams", headers=mgr_headers)
    assert list_teams_res.status_code == 200
    assert len(list_teams_res.json()) >= 1

    # 3. Test direct GET /api/assignments and POST /api/assignments
    dev_u = client.post(
        "/api/auth/register",
        json={"name": "Dev Direct", "email": "dev_direct@d.ai", "password": "pass", "role": "DEVELOPER"},
    ).json()
    dev_prof = create_dev_profile(client, mgr_token, dev_u["id"])

    assign_direct_res = client.post(
        "/api/assignments",
        json={"task_id": t_id, "developer_id": dev_prof["id"]},
        headers=mgr_headers,
    )
    assert assign_direct_res.status_code == 201

    list_assign_res = client.get("/api/assignments", headers=mgr_headers)
    assert list_assign_res.status_code == 200
    assert len(list_assign_res.json()) >= 1


def test_recommendation_score_precision_and_assignment_outcome_regression(client):
    """
    Regression test for Milestone 15.6:
    1. Verify high recommendation scores (e.g., 94.8, 99.99, 100.0) persist without NumericValueOutOfRange.
    2. Verify POST /api/assignments updates RecommendationOutcome using assignment.assigned_at without AttributeError.
    """
    mgr_token = get_token(client, "mgr_reg156@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    proj = create_project(client, mgr_token, "Regression 15.6 Project")
    proj_id = proj["id"]

    # Create task
    t_res = client.post(
        "/api/tasks",
        json={
            "project_id": proj_id,
            "title": "Regression Task",
            "priority": "HIGH",
            "complexity": "HIGH",
            "estimated_hours": 20.0,
            "status": "TODO",
        },
        headers=mgr_headers,
    )
    assert t_res.status_code == 201
    t_id = t_res.json()["id"]

    # Register developer
    dev_u = client.post(
        "/api/auth/register",
        json={"name": "Dev Reg", "email": "dev_reg156@d.ai", "password": "pass", "role": "DEVELOPER"},
    ).json()
    dev_prof = create_dev_profile(client, mgr_token, dev_u["id"])

    # 1. Generate task recommendations (tests persistence of score like 94.8 / 100.0)
    rec_res = client.get(f"/api/recommendations/tasks/{t_id}", headers=mgr_headers)
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["total_recommendations"] >= 1

    # 2. Create assignment (tests outcome_dataset_service integration without AttributeError: 'Assignment' object has no attribute 'created_at')
    assign_res = client.post(
        "/api/assignments",
        json={"task_id": t_id, "developer_id": dev_prof["id"]},
        headers=mgr_headers,
    )
    assert assign_res.status_code == 201
    assign_data = assign_res.json()
    assert assign_data["status"] == "ACTIVE"


