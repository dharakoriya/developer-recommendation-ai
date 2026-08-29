import os
import sys
import uuid
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal, engine, Base
from app.main import app


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_dashboard_api_authorization_protection(client: TestClient):
    # Unauthenticated requests return 401
    res_summary = client.get("/api/dashboard/summary")
    assert res_summary.status_code == 401

    res_wl = client.get("/api/dashboard/workload")
    assert res_wl.status_code == 401

    res_rec = client.get("/api/dashboard/recommendations")
    assert res_rec.status_code == 401
