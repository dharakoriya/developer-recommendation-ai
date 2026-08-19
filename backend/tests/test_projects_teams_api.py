import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole, ProjectStatus, AvailabilityStatus

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


def create_dev_profile(client, token, user_id):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        "/api/developers",
        json={
            "user_id": user_id,
            "experience_years": 4.0,
            "availability_status": "AVAILABLE",
            "performance_score": 88.0,
        },
        headers=headers,
    )
    return res.json()


# --- PROJECTS API TESTS ---

def test_authorized_project_creation(client):
    admin_token = get_token(client, "admin@d.ai", "pass123", role="ADMIN", name="Admin User")
    manager_token = get_token(client, "mgr@d.ai", "pass123", role="MANAGER", name="Manager User")

    # ADMIN creates project
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    res1 = client.post(
        "/api/projects",
        json={"name": "Project Alpha", "description": "Alpha Description", "status": "ACTIVE"},
        headers=headers_admin,
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["name"] == "Project Alpha"
    assert data1["status"] == "ACTIVE"
    assert data1["creator_name"] == "Admin User"

    # MANAGER creates project
    headers_mgr = {"Authorization": f"Bearer {manager_token}"}
    res2 = client.post(
        "/api/projects",
        json={"name": "Project Beta", "description": "Beta Description", "status": "ACTIVE"},
        headers=headers_mgr,
    )
    assert res2.status_code == 201
    assert res2.json()["name"] == "Project Beta"


def test_unauthorized_project_creation(client):
    dev_token = get_token(client, "dev@d.ai", "pass123", role="DEVELOPER", name="Dev User")
    headers = {"Authorization": f"Bearer {dev_token}"}

    # DEVELOPER attempt to create project -> 403 Forbidden
    res = client.post(
        "/api/projects",
        json={"name": "Unauthorized Project"},
        headers=headers,
    )
    assert res.status_code == 403

    # Unauthenticated attempt -> 401 Unauthorized
    res_unauth = client.post("/api/projects", json={"name": "No Token Project"})
    assert res_unauth.status_code == 401


def test_project_listing_and_retrieval(client):
    mgr_token = get_token(client, "mgr2@d.ai", "pass123", role="MANAGER")
    dev_token = get_token(client, "dev2@d.ai", "pass123", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Create projects
    p1 = client.post("/api/projects", json={"name": "P1", "status": "ACTIVE"}, headers=mgr_headers).json()
    p2 = client.post("/api/projects", json={"name": "P2", "status": "COMPLETED"}, headers=mgr_headers).json()

    # DEVELOPER can list all projects
    list_res = client.get("/api/projects", headers=dev_headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) == 2

    # Filter by status
    filtered = client.get("/api/projects?status=COMPLETED", headers=dev_headers).json()
    assert len(filtered) == 1
    assert filtered[0]["id"] == p2["id"]

    # Get single project
    get_res = client.get(f"/api/projects/{p1['id']}", headers=dev_headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "P1"


def test_project_update_and_deletion(client):
    mgr_token = get_token(client, "mgr3@d.ai", "pass123", role="MANAGER")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    p = client.post("/api/projects", json={"name": "Project Update Test"}, headers=headers).json()
    p_id = p["id"]

    # Update project
    upd_res = client.put(
        f"/api/projects/{p_id}",
        json={"name": "Updated Name", "status": "COMPLETED"},
        headers=headers,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Updated Name"
    assert upd_res.json()["status"] == "COMPLETED"

    # Delete project
    del_res = client.delete(f"/api/projects/{p_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404 after deletion
    get_res = client.get(f"/api/projects/{p_id}", headers=headers)
    assert get_res.status_code == 404


def test_invalid_project_id_and_validation(client):
    mgr_token = get_token(client, "mgr4@d.ai", "pass123", role="MANAGER")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    random_id = str(uuid.uuid4())
    assert client.get(f"/api/projects/{random_id}", headers=headers).status_code == 404

    # Invalid status enum -> 422 Unprocessable Entity
    invalid_status_res = client.post(
        "/api/projects",
        json={"name": "Bad Status", "status": "INVALID_STATUS"},
        headers=headers,
    )
    assert invalid_status_res.status_code == 422

    # Required name missing -> 422
    missing_name_res = client.post("/api/projects", json={"description": "No Name"}, headers=headers)
    assert missing_name_res.status_code == 422


# --- TEAMS API TESTS ---

def test_team_crud_operations(client):
    mgr_token = get_token(client, "mgr5@d.ai", "pass123", role="MANAGER")
    dev_token = get_token(client, "dev3@d.ai", "pass123", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Create project
    proj = client.post("/api/projects", json={"name": "Team Project"}, headers=mgr_headers).json()
    proj_id = proj["id"]

    # Create Team (MANAGER)
    create_team_res = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Backend Team", "description": "Core backend team"},
        headers=mgr_headers,
    )
    assert create_team_res.status_code == 201
    team = create_team_res.json()
    assert team["name"] == "Backend Team"
    team_id = team["id"]

    # DEVELOPER cannot create team
    dev_create_team = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Dev Team"},
        headers=dev_headers,
    )
    assert dev_create_team.status_code == 403

    # List teams in project
    list_teams_res = client.get(f"/api/projects/{proj_id}/teams", headers=dev_headers)
    assert list_teams_res.status_code == 200
    assert len(list_teams_res.json()) == 1

    # Get team details
    get_team_res = client.get(f"/api/teams/{team_id}", headers=dev_headers)
    assert get_team_res.status_code == 200
    assert get_team_res.json()["name"] == "Backend Team"

    # Update team
    upd_team_res = client.put(
        f"/api/teams/{team_id}",
        json={"name": "Backend & Cloud Team"},
        headers=mgr_headers,
    )
    assert upd_team_res.status_code == 200
    assert upd_team_res.json()["name"] == "Backend & Cloud Team"

    # Delete team
    del_team_res = client.delete(f"/api/teams/{team_id}", headers=mgr_headers)
    assert del_team_res.status_code == 204

    # Verify team 404 after deletion
    assert client.get(f"/api/teams/{team_id}", headers=dev_headers).status_code == 404


def test_team_invalid_ids(client):
    mgr_token = get_token(client, "mgr6@d.ai", "pass123", role="MANAGER")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    random_id = str(uuid.uuid4())
    # Create team under nonexistent project -> 404
    res = client.post(f"/api/projects/{random_id}/teams", json={"name": "Ghost Team"}, headers=headers)
    assert res.status_code == 404

    # Get nonexistent team -> 404
    assert client.get(f"/api/teams/{random_id}", headers=headers).status_code == 404


# --- TEAM MEMBERS API TESTS ---

def test_team_members_management(client):
    mgr_token = get_token(client, "mgr7@d.ai", "pass123", role="MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Register developer user and profile
    client.post(
        "/api/auth/register",
        json={"name": "John Dev", "email": "john@d.ai", "password": "pass", "role": "DEVELOPER"},
    )
    dev_user_res = client.post("/api/auth/login", json={"email": "john@d.ai", "password": "pass"}).json()
    dev_user_id = dev_user_res["user"]["id"]
    dev_profile = create_dev_profile(client, mgr_token, dev_user_id)
    dev_profile_id = dev_profile["id"]

    # Create project & team
    proj = client.post("/api/projects", json={"name": "Member Project"}, headers=mgr_headers).json()
    team = client.post(f"/api/projects/{proj['id']}/teams", json={"name": "Web Team"}, headers=mgr_headers).json()
    team_id = team["id"]

    # Add developer to team
    add_res = client.post(
        f"/api/teams/{team_id}/members",
        json={"developer_id": dev_profile_id},
        headers=mgr_headers,
    )
    assert add_res.status_code == 201
    member_data = add_res.json()
    assert member_data["developer_id"] == dev_profile_id
    assert member_data["user_name"] == "John Dev"

    # List team members
    list_res = client.get(f"/api/teams/{team_id}/members", headers=mgr_headers)
    assert list_res.status_code == 200
    members = list_res.json()
    assert len(members) == 1
    assert members[0]["developer_id"] == dev_profile_id

    # Duplicate addition should return 400 Bad Request
    dup_res = client.post(
        f"/api/teams/{team_id}/members",
        json={"developer_id": dev_profile_id},
        headers=mgr_headers,
    )
    assert dup_res.status_code == 400
    assert "already an active member" in dup_res.json()["detail"]

    # Nonexistent developer profile -> 404
    bad_dev_id = str(uuid.uuid4())
    no_dev_res = client.post(
        f"/api/teams/{team_id}/members",
        json={"developer_id": bad_dev_id},
        headers=mgr_headers,
    )
    assert no_dev_res.status_code == 404

    # Remove developer from team
    rem_res = client.delete(f"/api/teams/{team_id}/members/{dev_profile_id}", headers=mgr_headers)
    assert rem_res.status_code == 204

    # Verify member list is now empty
    empty_res = client.get(f"/api/teams/{team_id}/members", headers=mgr_headers)
    assert len(empty_res.json()) == 0

    # Removing again should return 404
    rem_again_res = client.delete(f"/api/teams/{team_id}/members/{dev_profile_id}", headers=mgr_headers)
    assert rem_again_res.status_code == 404
