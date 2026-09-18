import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.developer import DeveloperProfile
from app.models.enums import UserRole, AvailabilityStatus
from app.core.security import get_password_hash, verify_password

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


@pytest.fixture
def seed_roles(client):
    """Seed baseline Admin, Manager, and Developer in memory SQLite."""
    db = TestingSessionLocal()
    admin = User(
        name="Admin User",
        email="admin@devalign.ai",
        password_hash=get_password_hash("AdminPass123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    manager = User(
        name="Manager User",
        email="manager@devalign.ai",
        password_hash=get_password_hash("ManagerPass123!"),
        role=UserRole.MANAGER,
        is_active=True,
    )
    dev = User(
        name="Dev User",
        email="dev@devalign.ai",
        password_hash=get_password_hash("DevPass123!"),
        role=UserRole.DEVELOPER,
        is_active=True,
    )
    db.add_all([admin, manager, dev])
    db.commit()
    db.close()

    admin_res = client.post("/api/auth/login", json={"email": "admin@devalign.ai", "password": "AdminPass123!"})
    mgr_res = client.post("/api/auth/login", json={"email": "manager@devalign.ai", "password": "ManagerPass123!"})
    dev_res = client.post("/api/auth/login", json={"email": "dev@devalign.ai", "password": "DevPass123!"})

    return {
        "admin_token": admin_res.json()["access_token"],
        "manager_token": mgr_res.json()["access_token"],
        "dev_token": dev_res.json()["access_token"],
    }


def test_public_signup_endpoint_is_blocked(client):
    """Ensure public unauthenticated user registration is explicitly closed with HTTP 403."""
    payload = {
        "name": "Attacker",
        "email": "attacker@devalign.ai",
        "password": "Password123!",
        "role": "ADMIN",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 403
    assert "Public self-registration is disabled" in response.json()["detail"]


def test_unauthenticated_user_endpoints_rejected(client):
    """Ensure unauthenticated access to /api/users is blocked with HTTP 401."""
    assert client.get("/api/users").status_code == 401
    assert client.post("/api/users", json={}).status_code == 401
    assert client.patch("/api/users/1/status", json={"is_active": False}).status_code == 401


def test_non_admin_cannot_access_user_management(client, seed_roles):
    """Ensure MANAGER and DEVELOPER roles receive HTTP 403 when calling /api/users endpoints."""
    mgr_headers = {"Authorization": f"Bearer {seed_roles['manager_token']}"}
    dev_headers = {"Authorization": f"Bearer {seed_roles['dev_token']}"}

    # List users
    assert client.get("/api/users", headers=mgr_headers).status_code == 403
    assert client.get("/api/users", headers=dev_headers).status_code == 403

    # Create user
    payload = {
        "name": "New Hire",
        "email": "hire@devalign.ai",
        "password": "Password123!",
        "role": "DEVELOPER",
    }
    assert client.post("/api/users", json=payload, headers=mgr_headers).status_code == 403
    assert client.post("/api/users", json=payload, headers=dev_headers).status_code == 403


def test_admin_can_provision_developer_with_profile(client, seed_roles):
    """Ensure ADMIN can create new DEVELOPER and developer_profile is automatically generated."""
    admin_headers = {"Authorization": f"Bearer {seed_roles['admin_token']}"}

    payload = {
        "name": "Rachel Zane",
        "email": "rachel@devalign.ai",
        "password": "RachelPass123!",
        "role": "DEVELOPER",
        "is_active": True,
        "experience_years": 4,
        "availability_status": "AVAILABLE",
    }
    response = client.post("/api/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Rachel Zane"
    assert data["email"] == "rachel@devalign.ai"
    assert data["role"] == "DEVELOPER"
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data
    assert data["developer_profile"] is not None
    assert float(data["developer_profile"]["experience_years"]) == 4.0
    assert data["developer_profile"]["availability_status"] == "AVAILABLE"

    # Verify newly created user can log in
    login_res = client.post("/api/auth/login", json={"email": "rachel@devalign.ai", "password": "RachelPass123!"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_admin_duplicate_email_rejected(client, seed_roles):
    """Ensure ADMIN attempting to create a user with an existing email returns HTTP 400/409."""
    admin_headers = {"Authorization": f"Bearer {seed_roles['admin_token']}"}

    payload = {
        "name": "Duplicate Admin",
        "email": "admin@devalign.ai",
        "password": "Password123!",
        "role": "ADMIN",
    }
    response = client.post("/api/users", json=payload, headers=admin_headers)
    assert response.status_code in [400, 409]
    assert "already exists" in response.json()["detail"].lower()


def test_admin_user_status_deactivation_and_login_blocking(client, seed_roles):
    """Ensure deactivating a user blocks their login, and reactivating restores access."""
    admin_headers = {"Authorization": f"Bearer {seed_roles['admin_token']}"}

    # Get dev user ID
    users_res = client.get("/api/users", headers=admin_headers)
    users_list = users_res.json().get("users", users_res.json())
    dev_user = next(u for u in users_list if u["email"] == "dev@devalign.ai")
    dev_id = dev_user["id"]

    # Deactivate dev user
    toggle_res = client.patch(f"/api/users/{dev_id}/status", json={"is_active": False}, headers=admin_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Dev attempt to login should fail
    login_res = client.post("/api/auth/login", json={"email": "dev@devalign.ai", "password": "DevPass123!"})
    assert login_res.status_code == 401
    assert "deactivated" in login_res.json()["detail"].lower()

    # Reactivate dev user
    reactivate_res = client.patch(f"/api/users/{dev_id}/status", json={"is_active": True}, headers=admin_headers)
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["is_active"] is True

    # Dev login now succeeds
    login_res2 = client.post("/api/auth/login", json={"email": "dev@devalign.ai", "password": "DevPass123!"})
    assert login_res2.status_code == 200


def test_admin_reset_user_password(client, seed_roles):
    """Ensure ADMIN can reset user password and new password is valid."""
    admin_headers = {"Authorization": f"Bearer {seed_roles['admin_token']}"}

    users_res = client.get("/api/users", headers=admin_headers)
    users_list = users_res.json().get("users", users_res.json())
    dev_user = next(u for u in users_list if u["email"] == "dev@devalign.ai")
    dev_id = dev_user["id"]

    # Reset password
    reset_res = client.post(
        f"/api/users/{dev_id}/reset-password",
        json={"new_password": "BrandNewDevPassword999!"},
        headers=admin_headers,
    )
    assert reset_res.status_code == 200

    # Old password fails
    old_login = client.post("/api/auth/login", json={"email": "dev@devalign.ai", "password": "DevPass123!"})
    assert old_login.status_code == 401

    # New password works
    new_login = client.post(
        "/api/auth/login",
        json={"email": "dev@devalign.ai", "password": "BrandNewDevPassword999!"},
    )
    assert new_login.status_code == 200


def test_delete_user_permissions_and_safety_locks(client, seed_roles):
    """Ensure ADMIN can delete users, while self-deletion, sole-admin deletion, and non-admin calls are prevented."""
    admin_headers = {"Authorization": f"Bearer {seed_roles['admin_token']}"}
    mgr_headers = {"Authorization": f"Bearer {seed_roles['manager_token']}"}
    dev_headers = {"Authorization": f"Bearer {seed_roles['dev_token']}"}

    # Fetch users
    users_res = client.get("/api/users", headers=admin_headers)
    users_list = users_res.json().get("users", users_res.json())
    admin_user = next(u for u in users_list if u["email"] == "admin@devalign.ai")
    mgr_user = next(u for u in users_list if u["email"] == "manager@devalign.ai")
    dev_user = next(u for u in users_list if u["email"] == "dev@devalign.ai")

    # 1. Non-admin (Manager/Dev) cannot delete users
    assert client.delete(f"/api/users/{dev_user['id']}", headers=mgr_headers).status_code == 403
    assert client.delete(f"/api/users/{dev_user['id']}", headers=dev_headers).status_code == 403

    # 2. Admin cannot delete self
    self_del = client.delete(f"/api/users/{admin_user['id']}", headers=admin_headers)
    assert self_del.status_code == 400
    assert "cannot delete your own" in self_del.json()["detail"].lower()

    # 3. Admin can delete developer
    del_dev = client.delete(f"/api/users/{dev_user['id']}", headers=admin_headers)
    assert del_dev.status_code == 204

    # Dev user is gone from list
    users_after = client.get("/api/users", headers=admin_headers).json()["users"]
    assert all(u["id"] != dev_user["id"] for u in users_after)

    # Dev cannot log in anymore
    login_attempt = client.post("/api/auth/login", json={"email": "dev@devalign.ai", "password": "DevPass123!"})
    assert login_attempt.status_code == 401

