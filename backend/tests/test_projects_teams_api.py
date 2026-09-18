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


from app.models.user import User
from app.models.developer import DeveloperProfile
from app.core.security import get_password_hash


def get_token(client, email, password, role="DEVELOPER", name="Test User"):
    db = TestingSessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if not existing:
        user_role = UserRole[role] if isinstance(role, str) else role
        u = User(name=name, email=email, password_hash=get_password_hash(password), role=user_role, is_active=True)
        db.add(u)
        db.commit()
    db.close()
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

    # List teams in project (Manager sees 1 team, unassigned Dev sees 0)
    list_teams_mgr = client.get(f"/api/projects/{proj_id}/teams", headers=mgr_headers)
    assert list_teams_mgr.status_code == 200
    assert len(list_teams_mgr.json()) == 1

    list_teams_dev = client.get(f"/api/projects/{proj_id}/teams", headers=dev_headers)
    assert list_teams_dev.status_code == 200
    assert len(list_teams_dev.json()) == 0

    # Create dev profile and add dev to team
    db = TestingSessionLocal()
    u_dev = db.query(User).filter(User.email == "dev3@d.ai").first()
    dev_prof = create_dev_profile(client, mgr_token, str(u_dev.id))
    db.close()

    add_res = client.post(f"/api/teams/{team_id}/members", json={"developer_id": dev_prof["id"]}, headers=mgr_headers)
    assert add_res.status_code == 201

    # Now assigned Developer can see team in list and detail
    list_teams_dev_assigned = client.get(f"/api/projects/{proj_id}/teams", headers=dev_headers)
    assert len(list_teams_dev_assigned.json()) == 1

    # Get team details (Assigned Developer)
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
    assert client.get(f"/api/teams/{team_id}", headers=mgr_headers).status_code == 404


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
    db = TestingSessionLocal()
    u_john = User(name="John Dev", email="john@d.ai", password_hash=get_password_hash("pass"), role=UserRole.DEVELOPER, is_active=True)
    db.add(u_john)
    db.commit()
    db.refresh(u_john)
    db.close()
    dev_profile = create_dev_profile(client, mgr_token, str(u_john.id))
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


def test_manager_team_isolation_and_filtering(client):
    """
    Ensure Manager A only sees Team A, Manager B only sees Team B,
    while Admin can view all teams.
    """
    admin_token = get_token(client, "admin_iso@d.ai", "pass123", role="ADMIN", name="Admin Iso")
    mgr_a_token = get_token(client, "mgr_a@d.ai", "pass123", role="MANAGER", name="Manager A")
    mgr_b_token = get_token(client, "mgr_b@d.ai", "pass123", role="MANAGER", name="Manager B")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mgr_a_headers = {"Authorization": f"Bearer {mgr_a_token}"}
    mgr_b_headers = {"Authorization": f"Bearer {mgr_b_token}"}

    # Create project
    proj = client.post("/api/projects", json={"name": "Isolation Project"}, headers=admin_headers).json()
    proj_id = proj["id"]

    # Manager A creates Team A
    team_a = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Team Alpha", "description": "Team Alpha Scope"},
        headers=mgr_a_headers,
    ).json()

    # Manager B creates Team B
    team_b = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Team Beta", "description": "Team Beta Scope"},
        headers=mgr_b_headers,
    ).json()

    # Verify Manager A lists ONLY Team A
    list_a = client.get("/api/teams", headers=mgr_a_headers).json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == team_a["id"]
    assert list_a[0]["name"] == "Team Alpha"

    # Verify Manager B lists ONLY Team B
    list_b = client.get("/api/teams", headers=mgr_b_headers).json()
    assert len(list_b) == 1
    assert list_b[0]["id"] == team_b["id"]
    assert list_b[0]["name"] == "Team Beta"

    # Verify project-level team listing also scopes for Manager A and B
    proj_list_a = client.get(f"/api/projects/{proj_id}/teams", headers=mgr_a_headers).json()
    assert len(proj_list_a) == 1
    assert proj_list_a[0]["id"] == team_a["id"]

    proj_list_b = client.get(f"/api/projects/{proj_id}/teams", headers=mgr_b_headers).json()
    assert len(proj_list_b) == 1
    assert proj_list_b[0]["id"] == team_b["id"]

    # Verify Admin lists ALL teams
    list_admin = client.get("/api/teams", headers=admin_headers).json()
    team_ids_admin = [t["id"] for t in list_admin]
    assert team_a["id"] in team_ids_admin
    assert team_b["id"] in team_ids_admin


def test_manager_cross_tenant_modifications_blocked(client):
    """
    Ensure Manager A is blocked with 403 Forbidden from accessing, updating,
    deleting, or modifying members of Team B owned by Manager B.
    """
    mgr_a_token = get_token(client, "mgr_a2@d.ai", "pass123", role="MANAGER", name="Manager A2")
    mgr_b_token = get_token(client, "mgr_b2@d.ai", "pass123", role="MANAGER", name="Manager B2")
    mgr_a_headers = {"Authorization": f"Bearer {mgr_a_token}"}
    mgr_b_headers = {"Authorization": f"Bearer {mgr_b_token}"}

    # Register developer
    db = TestingSessionLocal()
    u_dev = User(name="Sam Dev", email="sam_dev@d.ai", password_hash=get_password_hash("pass"), role=UserRole.DEVELOPER, is_active=True)
    db.add(u_dev)
    db.commit()
    db.refresh(u_dev)
    db.close()
    dev_profile = create_dev_profile(client, mgr_b_token, str(u_dev.id))
    dev_profile_id = dev_profile["id"]

    # Manager B creates Team B
    proj = client.post("/api/projects", json={"name": "Project Beta Guard"}, headers=mgr_b_headers).json()
    team_b = client.post(
        f"/api/projects/{proj['id']}/teams",
        json={"name": "Team Beta Guard"},
        headers=mgr_b_headers,
    ).json()
    team_b_id = team_b["id"]

    # Manager A attempts to read Team B details -> 403 Forbidden
    get_res = client.get(f"/api/teams/{team_b_id}", headers=mgr_a_headers)
    assert get_res.status_code == 403

    # Manager A attempts to update Team B -> 403 Forbidden
    put_res = client.put(f"/api/teams/{team_b_id}", json={"name": "Hijacked Team"}, headers=mgr_a_headers)
    assert put_res.status_code == 403

    # Manager A attempts to add member to Team B -> 403 Forbidden
    add_res = client.post(f"/api/teams/{team_b_id}/members", json={"developer_id": dev_profile_id}, headers=mgr_a_headers)
    assert add_res.status_code == 403

    # Manager B adds member to Team B -> 201 Created
    add_ok = client.post(f"/api/teams/{team_b_id}/members", json={"developer_id": dev_profile_id}, headers=mgr_b_headers)
    assert add_ok.status_code == 201

    # Manager A attempts to list members of Team B -> 403 Forbidden
    list_mem_res = client.get(f"/api/teams/{team_b_id}/members", headers=mgr_a_headers)
    assert list_mem_res.status_code == 403

    # Manager A attempts to remove member from Team B -> 403 Forbidden
    del_mem_res = client.delete(f"/api/teams/{team_b_id}/members/{dev_profile_id}", headers=mgr_a_headers)
    assert del_mem_res.status_code == 403

    # Manager A attempts to delete Team B -> 403 Forbidden
    del_team_res = client.delete(f"/api/teams/{team_b_id}", headers=mgr_a_headers)
    assert del_team_res.status_code == 403

    # Manager B can delete Team B -> 204 No Content
    del_ok = client.delete(f"/api/teams/{team_b_id}", headers=mgr_b_headers)
    assert del_ok.status_code == 204


def test_manager_cannot_reassign_team_manager(client):
    """
    Ensure Manager cannot change assigned manager_id, but Admin can.
    """
    admin_token = get_token(client, "admin_reassign@d.ai", "pass123", role="ADMIN")
    mgr_a_token = get_token(client, "mgr_reassign_a@d.ai", "pass123", role="MANAGER")
    mgr_b_token = get_token(client, "mgr_reassign_b@d.ai", "pass123", role="MANAGER")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mgr_a_headers = {"Authorization": f"Bearer {mgr_a_token}"}

    # Get Manager B user ID
    db = TestingSessionLocal()
    mgr_b_user = db.query(User).filter(User.email == "mgr_reassign_b@d.ai").first()
    mgr_b_id = str(mgr_b_user.id)
    db.close()

    # Manager A creates Team A
    proj = client.post("/api/projects", json={"name": "Reassign Project"}, headers=admin_headers).json()
    team_a = client.post(
        f"/api/projects/{proj['id']}/teams",
        json={"name": "Reassign Team"},
        headers=mgr_a_headers,
    ).json()
    team_a_id = team_a["id"]

    # Manager A attempts to reassign manager_id to Manager B -> 403 Forbidden
    mgr_reassign_res = client.put(
        f"/api/teams/{team_a_id}",
        json={"manager_id": mgr_b_id},
        headers=mgr_a_headers,
    )
    assert mgr_reassign_res.status_code == 403
    assert "Only administrators can assign or reassign team managers" in mgr_reassign_res.json()["detail"]

    # Admin reassigns manager_id to Manager B -> 200 OK
    admin_reassign_res = client.put(
        f"/api/teams/{team_a_id}",
        json={"manager_id": mgr_b_id},
        headers=admin_headers,
    )
    assert admin_reassign_res.status_code == 200
    assert admin_reassign_res.json()["manager_id"] == mgr_b_id


def test_manager_unassigned_team_blocked(client):
    """
    Ensure Manager cannot manage an unassigned team (manager_id is None).
    """
    admin_token = get_token(client, "admin_unassigned@d.ai", "pass123", role="ADMIN")
    mgr_token = get_token(client, "mgr_unassigned@d.ai", "pass123", role="MANAGER")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Admin creates unassigned team
    proj = client.post("/api/projects", json={"name": "Unassigned Project"}, headers=admin_headers).json()
    team = client.post(
        f"/api/projects/{proj['id']}/teams",
        json={"name": "Unassigned Team", "manager_id": None},
        headers=admin_headers,
    ).json()
    team_id = team["id"]

    # Manager attempting GET detail -> 403 Forbidden
    assert client.get(f"/api/teams/{team_id}", headers=mgr_headers).status_code == 403

    # Manager attempting PUT -> 403 Forbidden
    assert client.put(f"/api/teams/{team_id}", json={"name": "Stolen Team"}, headers=mgr_headers).status_code == 403

    # Manager attempting DELETE -> 403 Forbidden
    assert client.delete(f"/api/teams/{team_id}", headers=mgr_headers).status_code == 403


def test_developer_team_visibility_and_isolation(client):
    """
    Verify Developer team visibility:
    - Developer A sees ONLY their assigned team(s).
    - Developer B sees ONLY their assigned team(s).
    - Developer C (no team) sees empty list [].
    - Developer in multiple teams sees all of their teams.
    - Developer cannot view unrelated team detail or members.
    - Developer direct mutations (create, update, delete, add/remove members) are 403 Forbidden.
    """
    admin_token = get_token(client, "admin_dev_vis@d.ai", "pass123", role="ADMIN", name="Admin Vis")
    mgr_token = get_token(client, "mgr_dev_vis@d.ai", "pass123", role="MANAGER", name="Manager Vis")
    dev_a_token = get_token(client, "dev_a@d.ai", "pass123", role="DEVELOPER", name="Developer Alpha")
    dev_b_token = get_token(client, "dev_b@d.ai", "pass123", role="DEVELOPER", name="Developer Beta")
    dev_c_token = get_token(client, "dev_c@d.ai", "pass123", role="DEVELOPER", name="Developer Gamma")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_a_headers = {"Authorization": f"Bearer {dev_a_token}"}
    dev_b_headers = {"Authorization": f"Bearer {dev_b_token}"}
    dev_c_headers = {"Authorization": f"Bearer {dev_c_token}"}

    # Get developer user IDs and create DeveloperProfiles
    db = TestingSessionLocal()
    u_a = db.query(User).filter(User.email == "dev_a@d.ai").first()
    u_b = db.query(User).filter(User.email == "dev_b@d.ai").first()
    u_c = db.query(User).filter(User.email == "dev_c@d.ai").first()
    dev_a_prof = create_dev_profile(client, admin_token, str(u_a.id))
    dev_b_prof = create_dev_profile(client, admin_token, str(u_b.id))
    dev_c_prof = create_dev_profile(client, admin_token, str(u_c.id))
    db.close()

    # Create project and teams
    proj = client.post("/api/projects", json={"name": "Dev Visibility Project"}, headers=mgr_headers).json()
    proj_id = proj["id"]

    team_1 = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Alpha Squad", "description": "Team 1 for Dev A"},
        headers=mgr_headers,
    ).json()
    team_1_id = team_1["id"]

    team_2 = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Beta Squad", "description": "Team 2 for Dev B"},
        headers=mgr_headers,
    ).json()
    team_2_id = team_2["id"]

    team_3 = client.post(
        f"/api/projects/{proj_id}/teams",
        json={"name": "Cross Functional Squad", "description": "Team 3 for Dev A as well"},
        headers=mgr_headers,
    ).json()
    team_3_id = team_3["id"]

    # Assign Dev A to Team 1 and Team 3
    client.post(f"/api/teams/{team_1_id}/members", json={"developer_id": dev_a_prof["id"]}, headers=mgr_headers)
    client.post(f"/api/teams/{team_3_id}/members", json={"developer_id": dev_a_prof["id"]}, headers=mgr_headers)

    # Assign Dev B to Team 2
    client.post(f"/api/teams/{team_2_id}/members", json={"developer_id": dev_b_prof["id"]}, headers=mgr_headers)

    # Dev C is assigned to no team.

    # 1. Dev A lists teams -> should see Team 1 and Team 3
    list_dev_a = client.get("/api/teams", headers=dev_a_headers).json()
    assert len(list_dev_a) == 2
    dev_a_team_ids = [t["id"] for t in list_dev_a]
    assert team_1_id in dev_a_team_ids
    assert team_3_id in dev_a_team_ids
    assert team_2_id not in dev_a_team_ids

    # 2. Dev B lists teams -> should see ONLY Team 2
    list_dev_b = client.get("/api/teams", headers=dev_b_headers).json()
    assert len(list_dev_b) == 1
    assert list_dev_b[0]["id"] == team_2_id
    assert list_dev_b[0]["name"] == "Beta Squad"

    # 3. Dev C lists teams -> should see empty list []
    list_dev_c = client.get("/api/teams", headers=dev_c_headers).json()
    assert len(list_dev_c) == 0

    # 4. Project-nested teams endpoint (/api/projects/{proj_id}/teams)
    proj_dev_a = client.get(f"/api/projects/{proj_id}/teams", headers=dev_a_headers).json()
    assert len(proj_dev_a) == 2
    proj_dev_b = client.get(f"/api/projects/{proj_id}/teams", headers=dev_b_headers).json()
    assert len(proj_dev_b) == 1
    assert proj_dev_b[0]["id"] == team_2_id
    proj_dev_c = client.get(f"/api/projects/{proj_id}/teams", headers=dev_c_headers).json()
    assert len(proj_dev_c) == 0

    # 5. Direct team detail (/api/teams/{team_id})
    # Dev A accessing Team 1 -> 200 OK
    res_a_team1 = client.get(f"/api/teams/{team_1_id}", headers=dev_a_headers)
    assert res_a_team1.status_code == 200
    assert res_a_team1.json()["name"] == "Alpha Squad"

    # Dev A accessing Team 2 (unrelated) -> 403 Forbidden
    res_a_team2 = client.get(f"/api/teams/{team_2_id}", headers=dev_a_headers)
    assert res_a_team2.status_code == 403
    assert "Not authorized to view this team" in res_a_team2.json()["detail"]

    # Dev C accessing Team 1 -> 403 Forbidden
    res_c_team1 = client.get(f"/api/teams/{team_1_id}", headers=dev_c_headers)
    assert res_c_team1.status_code == 403

    # 6. Direct team members list (/api/teams/{team_id}/members)
    # Dev A accessing Team 1 members -> 200 OK
    res_a_mems = client.get(f"/api/teams/{team_1_id}/members", headers=dev_a_headers)
    assert res_a_mems.status_code == 200
    assert len(res_a_mems.json()) == 1
    assert res_a_mems.json()[0]["developer_id"] == dev_a_prof["id"]

    # Dev A accessing Team 2 members -> 403 Forbidden
    assert client.get(f"/api/teams/{team_2_id}/members", headers=dev_a_headers).status_code == 403

    # 7. Mutation restrictions for Developer (Must NOT create, update, delete, or manage members)
    # Create Team direct -> 403
    assert client.post("/api/teams", json={"project_id": proj_id, "name": "Hacked Team"}, headers=dev_a_headers).status_code == 403
    # Create Team in project -> 403
    assert client.post(f"/api/projects/{proj_id}/teams", json={"name": "Hacked Team"}, headers=dev_a_headers).status_code == 403
    # Update Team -> 403
    assert client.put(f"/api/teams/{team_1_id}", json={"name": "Renamed By Dev"}, headers=dev_a_headers).status_code == 403
    # Delete Team -> 403
    assert client.delete(f"/api/teams/{team_1_id}", headers=dev_a_headers).status_code == 403
    # Add member -> 403
    assert client.post(f"/api/teams/{team_1_id}/members", json={"developer_id": dev_b_prof["id"]}, headers=dev_a_headers).status_code == 403
    # Remove member -> 403
    assert client.delete(f"/api/teams/{team_1_id}/members/{dev_a_prof['id']}", headers=dev_a_headers).status_code == 403

    # 8. Manager & Admin retain full access
    mgr_list = client.get("/api/teams", headers=mgr_headers).json()
    assert len(mgr_list) == 3
    admin_list = client.get("/api/teams", headers=admin_headers).json()
    assert len(admin_list) >= 3


