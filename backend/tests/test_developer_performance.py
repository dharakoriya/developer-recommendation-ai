import pytest
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.developer import DeveloperProfile
from app.models.task import Task, Assignment
from app.models.enums import TaskComplexity, TaskPriority, TaskStatus, AssignmentStatus, AvailabilityStatus
from app.models.user import User, UserRole
from app.services.performance_service import (
    calculate_developer_performance_metrics,
    snapshot_developer_performance,
)

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_developer_performance_metrics_no_tasks(db):
    u = User(name="Perf Dev 1", email="perf1@test.com", password_hash="hash", role=UserRole.DEVELOPER)
    db.add(u)
    db.commit()

    dev = DeveloperProfile(user_id=u.id, experience_years=Decimal("5.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("75.0"))
    db.add(dev)
    db.commit()

    metrics = calculate_developer_performance_metrics(db, dev.id)
    assert metrics["completed_tasks"] == 0
    assert metrics["completion_rate"] == 100.0
    assert metrics["performance_score"] == 75.0


def test_developer_performance_metrics_with_completed_tasks(db):
    u_mgr = User(name="Manager Perf", email="mgrperf@test.com", password_hash="hash", role=UserRole.MANAGER)
    u_dev = User(name="Perf Dev 2", email="perf2@test.com", password_hash="hash", role=UserRole.DEVELOPER)
    db.add_all([u_mgr, u_dev])
    db.commit()

    dev = DeveloperProfile(user_id=u_dev.id, experience_years=Decimal("4.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("80.0"))
    db.add(dev)
    db.commit()

    from app.models.project import Project, ProjectStatus
    proj = Project(name="Test Proj", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
    db.add(proj)
    db.commit()

    t1 = Task(
        project_id=proj.id, title="High Task", complexity=TaskComplexity.HIGH, priority=TaskPriority.HIGH,
        estimated_hours=Decimal("20.0"), status=TaskStatus.COMPLETED, created_by=u_mgr.id, task_weight_score=Decimal("80.0")
    )
    db.add(t1)
    db.commit()

    now = datetime.now(timezone.utc)
    a1 = Assignment(
        task_id=t1.id, developer_id=dev.id, assigned_by=u_mgr.id, status=AssignmentStatus.COMPLETED,
        assigned_at=now, completed_at=now
    )
    db.add(a1)
    db.commit()

    metrics = calculate_developer_performance_metrics(db, dev.id)
    assert metrics["completed_tasks"] == 1
    assert metrics["completion_rate"] == 100.0
    assert metrics["weighted_productivity"] == 80.0
    assert metrics["performance_score"] > 80.0
