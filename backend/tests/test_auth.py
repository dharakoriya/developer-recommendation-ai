import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.enums import UserRole

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


def test_user_registration(client):
    """Test user registration for different roles."""
    payload = {
        "name": "Jane Manager",
        "email": "jane@devalign.ai",
        "password": "Password123!",
        "role": "MANAGER",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jane Manager"
    assert data["email"] == "jane@devalign.ai"
    assert data["role"] == "MANAGER"
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data


def test_duplicate_user_registration_fails(client):
    """Test that duplicate email registration returns HTTP 400."""
    payload = {
        "name": "User 1",
        "email": "dup@devalign.ai",
        "password": "Password123!",
        "role": "DEVELOPER",
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert res2.json()["detail"] == "Email already registered"


def test_login_success_and_jwt_issuance(client):
    """Test successful user login and access token response structure."""
    reg_payload = {
        "name": "Dev User",
        "email": "dev@devalign.ai",
        "password": "SecretPassword123",
        "role": "DEVELOPER",
    }
    client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "dev@devalign.ai",
        "password": "SecretPassword123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "dev@devalign.ai"
    assert data["user"]["role"] == "DEVELOPER"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_login_invalid_password(client):
    """Test login with incorrect password returns HTTP 401."""
    reg_payload = {
        "name": "Dev User",
        "email": "dev@devalign.ai",
        "password": "CorrectPassword123",
        "role": "DEVELOPER",
    }
    client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "dev@devalign.ai",
        "password": "WrongPassword123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_unknown_user(client):
    """Test login with non-existent user returns HTTP 401."""
    login_payload = {
        "email": "nonexistent@devalign.ai",
        "password": "SomePassword123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_get_me_unauthenticated(client):
    """Test accessing /api/auth/me without authorization header returns HTTP 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_get_me_authenticated(client):
    """Test accessing /api/auth/me with valid Bearer token."""
    reg_payload = {
        "name": "Admin User",
        "email": "admin@devalign.ai",
        "password": "AdminPassword123",
        "role": "ADMIN",
    }
    client.post("/api/auth/register", json=reg_payload)

    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@devalign.ai", "password": "AdminPassword123"},
    )
    token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["name"] == "Admin User"
    assert data["email"] == "admin@devalign.ai"
    assert data["role"] == "ADMIN"


def test_role_authorization_permissions(client):
    """Test role-based authorization rules (ADMIN, MANAGER, DEVELOPER)."""
    # Create ADMIN
    client.post("/api/auth/register", json={"name": "A", "email": "a@d.ai", "password": "p", "role": "ADMIN"})
    admin_token = client.post("/api/auth/login", json={"email": "a@d.ai", "password": "p"}).json()["access_token"]

    # Create MANAGER
    client.post("/api/auth/register", json={"name": "M", "email": "m@d.ai", "password": "p", "role": "MANAGER"})
    manager_token = client.post("/api/auth/login", json={"email": "m@d.ai", "password": "p"}).json()["access_token"]

    # Create DEVELOPER
    client.post("/api/auth/register", json={"name": "D", "email": "d@d.ai", "password": "p", "role": "DEVELOPER"})
    dev_token = client.post("/api/auth/login", json={"email": "d@d.ai", "password": "p"}).json()["access_token"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Test /api/auth/test-role/admin (ADMIN only)
    assert client.get("/api/auth/test-role/admin", headers=admin_headers).status_code == 200
    assert client.get("/api/auth/test-role/admin", headers=manager_headers).status_code == 403
    assert client.get("/api/auth/test-role/admin", headers=dev_headers).status_code == 403

    # Test /api/auth/test-role/manager (ADMIN or MANAGER)
    assert client.get("/api/auth/test-role/manager", headers=admin_headers).status_code == 200
    assert client.get("/api/auth/test-role/manager", headers=manager_headers).status_code == 200
    assert client.get("/api/auth/test-role/manager", headers=dev_headers).status_code == 403


def test_invalid_jwt_token_returns_401(client):
    """Test tampered or malformed JWT token returns HTTP 401."""
    invalid_headers = {"Authorization": "Bearer invalid_tampered_token_string"}
    response = client.get("/api/auth/me", headers=invalid_headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
