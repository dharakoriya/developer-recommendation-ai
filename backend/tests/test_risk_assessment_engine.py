import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal, engine, Base
from app.main import app
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.developer import DeveloperProfile
from app.models.enums import UserRole, TaskPriority, TaskComplexity, TaskStatus, AvailabilityStatus, ProjectStatus
from app.core.security import get_password_hash
from app.services.risk_assessment_service import (
    assess_task_risk,
    assess_developer_delivery_risk,
    assess_project_risk,
    get_system_risk_summary,
)


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


def test_task_risk_assessment_calculation(db: Session):
    creator = User(name="Manager User", email=f"mgr-{uuid.uuid4().hex[:6]}@example.com", password_hash=get_password_hash("pw"), role=UserRole.MANAGER)
    db.add(creator)
    db.commit()

    proj = Project(name="Risk Test Project", status=ProjectStatus.ACTIVE, created_by=creator.id)
    db.add(proj)
    db.commit()

    deadline_soon = datetime.now(timezone.utc) + timedelta(days=1)
    task = Task(
        project_id=proj.id,
        title="Urgent High Complexity Task",
        priority=TaskPriority.CRITICAL,
        complexity=TaskComplexity.HIGH,
        estimated_hours=Decimal("20.0"),
        task_weight_score=Decimal("80.0"),
        deadline=deadline_soon,
        status=TaskStatus.TODO,
        created_by=creator.id,
    )
    db.add(task)
    db.commit()

    risk_res = assess_task_risk(db, task.id)
    assert risk_res["task_id"] == str(task.id)
    assert risk_res["overall_risk_level"] in ["HIGH", "CRITICAL"]
    assert risk_res["overall_risk_score"] > 50.0
    assert len(risk_res["drivers"]) > 0


def test_developer_delivery_risk(db: Session):
    user = User(name="Dev Delivery Risk User", email=f"devrisk-{uuid.uuid4().hex[:6]}@example.com", password_hash=get_password_hash("pw"), role=UserRole.DEVELOPER)
    db.add(user)
    db.commit()

    dev = DeveloperProfile(user_id=user.id, experience_years=Decimal("2.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("55.0"))
    db.add(dev)
    db.commit()

    risk_res = assess_developer_delivery_risk(db, dev.id)
    assert risk_res["developer_id"] == str(dev.id)
    assert risk_res["delivery_risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "explanation" in risk_res


def test_project_risk_assessment(db: Session):
    creator = User(name="Project Risk Creator", email=f"prjrisk-{uuid.uuid4().hex[:6]}@example.com", password_hash=get_password_hash("pw"), role=UserRole.MANAGER)
    db.add(creator)
    db.commit()

    proj = Project(name="Aggregated Risk Project", status=ProjectStatus.ACTIVE, created_by=creator.id)
    db.add(proj)
    db.commit()

    risk_res = assess_project_risk(db, proj.id)
    assert risk_res["project_id"] == str(proj.id)
    assert "overall_risk_level" in risk_res
    assert "task_counts" in risk_res


def test_risk_api_unauthorized_access(client: TestClient):
    res = client.get("/api/risk/summary")
    assert res.status_code == 401
