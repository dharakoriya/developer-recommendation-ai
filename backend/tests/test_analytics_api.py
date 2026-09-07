import pytest
from sqlalchemy import select
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import create_access_token, get_password_hash

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_token_for_user_role(db, role: UserRole) -> str:
    user = db.scalar(select(User).where(User.role == role))
    if not user:
        user = User(
            name=f"Test {role.value}",
            email=f"test_{role.value.lower()}@devalign.ai",
            password_hash=get_password_hash("password123"),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})


def test_recommendation_audit_api_authentication_and_cors(db):
    token = get_token_for_user_role(db, UserRole.ADMIN)
    
    # 1. Unauthenticated request -> 401
    unauth_res = client.get("/api/recommendations/audit")
    assert unauth_res.status_code == 401
    
    # 2. Authenticated request -> 200 OK
    auth_res = client.get(
        "/api/recommendations/audit",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_res.status_code == 200
    assert isinstance(auth_res.json(), list)


def test_project_health_analytics_endpoint(db):
    token = get_token_for_user_role(db, UserRole.ADMIN)
    res = client.get(
        "/api/analytics/projects",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "overall_avg_health_score" in data
    assert "healthy_projects_count" in data
    assert "projects" in data
    assert isinstance(data["projects"], list)


def test_team_capacity_analytics_endpoint(db):
    token = get_token_for_user_role(db, UserRole.MANAGER)
    res = client.get(
        "/api/analytics/teams",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_capacity_hours" in data
    assert "workload_distribution" in data
    assert "team_productivity" in data


def test_developer_comparison_rbac_restriction(db):
    admin_token = get_token_for_user_role(db, UserRole.ADMIN)
    dev_token = get_token_for_user_role(db, UserRole.DEVELOPER)

    # Admin access -> 200 OK
    admin_res = client.get(
        "/api/analytics/developers",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_res.status_code == 200
    assert "developers" in admin_res.json()

    # Developer role access -> 403 Forbidden
    dev_res = client.get(
        "/api/analytics/developers",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert dev_res.status_code == 403
    assert "Developer role is restricted" in dev_res.json()["detail"]


def test_task_intelligence_analytics_endpoint(db):
    token = get_token_for_user_role(db, UserRole.ADMIN)
    res = client.get(
        "/api/analytics/tasks",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "priority_distribution" in data
    assert "complexity_distribution" in data
    assert "weight_distribution" in data


def test_recommendation_effectiveness_funnel_endpoint(db):
    token = get_token_for_user_role(db, UserRole.ADMIN)
    res = client.get(
        "/api/analytics/recommendations",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "recommendations_generated" in data
    assert "acceptance_rate" in data
    assert "assignment_conversion_rate" in data
    assert "completion_conversion_rate" in data
