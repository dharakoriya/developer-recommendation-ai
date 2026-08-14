import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole, AvailabilityStatus

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


# --- SKILLS API TESTS ---

def test_create_skill_and_duplicate_handling(client):
    manager_token = get_token(client, "mgr@d.ai", "pass", role="MANAGER")
    headers = {"Authorization": f"Bearer {manager_token}"}

    # Create Python skill
    res1 = client.post("/api/skills", json={"name": "Python", "category": "Backend"}, headers=headers)
    assert res1.status_code == 201
    data = res1.json()
    assert data["name"] == "Python"
    assert data["category"] == "Backend"

    # Duplicate name should return 400
    res2 = client.post("/api/skills", json={"name": "python", "category": "Core"}, headers=headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_skill_unauthorized_developer_access(client):
    dev_token = get_token(client, "dev@d.ai", "pass", role="DEVELOPER")
    headers = {"Authorization": f"Bearer {dev_token}"}

    # DEVELOPER can read skills
    list_res = client.get("/api/skills", headers=headers)
    assert list_res.status_code == 200

    # DEVELOPER cannot create/update/delete skills
    create_res = client.post("/api/skills", json={"name": "Rust"}, headers=headers)
    assert create_res.status_code == 403


def test_skill_update_and_delete(client):
    mgr_token = get_token(client, "mgr2@d.ai", "pass", role="MANAGER")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    skill = client.post("/api/skills", json={"name": "JS", "category": "Web"}, headers=headers).json()
    skill_id = skill["id"]

    # Update
    update_res = client.put(f"/api/skills/{skill_id}", json={"name": "JavaScript", "category": "Frontend"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "JavaScript"

    # Delete
    del_res = client.delete(f"/api/skills/{skill_id}", headers=headers)
    assert del_res.status_code == 240 or del_res.status_code == 204

    # Verify 404 after delete
    get_res = client.get(f"/api/skills/{skill_id}", headers=headers)
    assert get_res.status_code == 404


# --- DEVELOPERS API TESTS ---

def test_developer_profile_crud_flow(client):
    mgr_token = get_token(client, "mgr3@d.ai", "pass", role="MANAGER")
    dev_token = get_token(client, "dev1@d.ai", "pass", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Get dev user id
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {dev_token}"}).json()
    dev_user_id = me["id"]

    # Create developer profile as MANAGER
    create_payload = {
        "user_id": dev_user_id,
        "experience_years": 4.5,
        "availability_status": "AVAILABLE",
        "performance_score": 92.0,
    }
    create_res = client.post("/api/developers", json=create_payload, headers=mgr_headers)
    assert create_res.status_code == 201
    dev_profile = create_res.json()
    dev_id = dev_profile["id"]
    assert dev_profile["user_id"] == dev_user_id
    assert dev_profile["user_name"] == "Test User"

    # Duplicate profile for same user returns 400
    dup_res = client.post("/api/developers", json=create_payload, headers=mgr_headers)
    assert dup_res.status_code == 400

    # List developers
    list_res = client.get("/api/developers", headers=mgr_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Update developer profile
    update_res = client.put(f"/api/developers/{dev_id}", json={"experience_years": 5.0, "availability_status": "PARTIAL"}, headers=mgr_headers)
    assert update_res.status_code == 200
    assert float(update_res.json()["experience_years"]) == 5.0
    assert update_res.json()["availability_status"] == "PARTIAL"


def test_developer_update_forbidden_for_other_developer(client):
    mgr_token = get_token(client, "mgr4@d.ai", "pass", role="MANAGER")
    dev1_token = get_token(client, "dev1_user@d.ai", "pass", role="DEVELOPER")
    dev2_token = get_token(client, "dev2_user@d.ai", "pass", role="DEVELOPER")

    # Create dev1 profile
    me1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {dev1_token}"}).json()
    profile1 = client.post("/api/developers", json={"user_id": me1["id"], "experience_years": 2.0}, headers={"Authorization": f"Bearer {mgr_token}"}).json()

    # Dev2 tries to update Dev1 profile -> 403 Forbidden
    update_res = client.put(f"/api/developers/{profile1['id']}", json={"experience_years": 10.0}, headers={"Authorization": f"Bearer {dev2_token}"})
    assert update_res.status_code == 403


# --- DEVELOPER SKILLS API TESTS ---

def test_developer_skill_assignment_and_validation(client):
    mgr_token = get_token(client, "mgr5@d.ai", "pass", role="MANAGER")
    dev_token = get_token(client, "dev_skill@d.ai", "pass", role="DEVELOPER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Setup dev profile and skill
    me = client.get("/api/auth/me", headers=dev_headers).json()
    dev_profile = client.post("/api/developers", json={"user_id": me["id"], "experience_years": 3.0}, headers=mgr_headers).json()
    dev_id = dev_profile["id"]

    skill = client.post("/api/skills", json={"name": "FastAPI", "category": "Backend"}, headers=mgr_headers).json()
    skill_id = skill["id"]

    # Assign skill with valid proficiency (85.0)
    assign_res = client.post(f"/api/developers/{dev_id}/skills", json={"skill_id": skill_id, "proficiency_level": 85.0}, headers=dev_headers)
    assert assign_res.status_code == 201
    data = assign_res.json()
    assert data["skill_name"] == "FastAPI"
    assert float(data["proficiency_level"]) == 85.0

    # Invalid proficiency > 100 returns 422
    invalid_res = client.post(f"/api/developers/{dev_id}/skills", json={"skill_id": skill_id, "proficiency_level": 150.0}, headers=dev_headers)
    assert invalid_res.status_code == 422

    # Duplicate skill assignment returns 400
    dup_res = client.post(f"/api/developers/{dev_id}/skills", json={"skill_id": skill_id, "proficiency_level": 90.0}, headers=dev_headers)
    assert dup_res.status_code == 400

    # Update proficiency level to 95.0
    update_res = client.put(f"/api/developers/{dev_id}/skills/{skill_id}", json={"proficiency_level": 95.0}, headers=dev_headers)
    assert update_res.status_code == 200
    assert float(update_res.json()["proficiency_level"]) == 95.0

    # Retrieve developer skills list
    get_skills_res = client.get(f"/api/developers/{dev_id}/skills", headers=dev_headers)
    assert get_skills_res.status_code == 200
    assert len(get_skills_res.json()) == 1

    # Remove skill association
    rem_res = client.delete(f"/api/developers/{dev_id}/skills/{skill_id}", headers=dev_headers)
    assert rem_res.status_code == 204

    # Verify skills list empty
    empty_res = client.get(f"/api/developers/{dev_id}/skills", headers=dev_headers)
    assert len(empty_res.json()) == 0
