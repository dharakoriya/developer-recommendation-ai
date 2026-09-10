import os
import sys
import uuid
import pytest
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal, engine, Base
from app.main import app
from app.models.user import User
from app.models.developer import DeveloperProfile
from app.models.enums import UserRole, AvailabilityStatus
from app.core.security import get_password_hash


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_developer_whitelisted_sort_field_validation(client: TestClient, db: Session):
    user = User(name="Test Admin", email=f"admin-{uuid.uuid4().hex[:6]}@example.com", password_hash=get_password_hash("pw"), role=UserRole.ADMIN)
    db.add(user)
    db.commit()

    # Login using json payload
    res = client.post("/api/auth/login", json={"email": user.email, "password": "pw"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test invalid sort field produces 400 Bad Request
    res_bad = client.get("/api/developers?sort_by=DROP_TABLE", headers=headers)
    assert res_bad.status_code == 400
    assert "Invalid sort field" in res_bad.json()["detail"]

    # Test valid sort fields succeed
    for valid_field in ["name", "experience", "performance", "workload", "availability"]:
        res_ok = client.get(f"/api/developers?sort_by={valid_field}&sort_order=asc", headers=headers)
        assert res_ok.status_code == 200, f"Failed for valid field {valid_field}"
