import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.developer import DeveloperProfile
from app.models.task import Task
from app.models.enums import TaskComplexity, TaskPriority, TaskStatus, AvailabilityStatus
from app.models.user import User, UserRole
from app.services.performance_service import (
    update_developer_streak_on_task_completion,
    evaluate_and_grant_developer_achievements,
    calculate_and_record_incentive_points,
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


def test_streak_calculation_rules(db):
    u = User(name="Streak Dev", email="streak@test.com", password_hash="hash", role=UserRole.DEVELOPER)
    db.add(u)
    db.commit()

    dev = DeveloperProfile(user_id=u.id, experience_years=Decimal("3.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("70.0"))
    db.add(dev)
    db.commit()

    today = date.today()

    # Low weight task (< 20) should not increment streak
    s1 = update_developer_streak_on_task_completion(db, dev.id, task_weight=15.0, completion_date=today)
    assert s1.current_streak == 0

    # Qualifying task (>= 20) increments streak
    s2 = update_developer_streak_on_task_completion(db, dev.id, task_weight=50.0, completion_date=today - timedelta(days=1))
    assert s2.current_streak == 1

    # Next consecutive day increments streak
    s3 = update_developer_streak_on_task_completion(db, dev.id, task_weight=50.0, completion_date=today)
    assert s3.current_streak == 2
    assert s3.longest_streak == 2


def test_incentive_points_calculation(db):
    u_mgr = User(name="Inc Mgr", email="incmgr@test.com", password_hash="hash", role=UserRole.MANAGER)
    u_dev = User(name="Inc Dev", email="incdev@test.com", password_hash="hash", role=UserRole.DEVELOPER)
    db.add_all([u_mgr, u_dev])
    db.commit()

    dev = DeveloperProfile(user_id=u_dev.id, experience_years=Decimal("5.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("80.0"))
    db.add(dev)
    db.commit()

    from app.models.project import Project, ProjectStatus
    proj = Project(name="Inc Proj", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
    db.add(proj)
    db.commit()

    t = Task(
        project_id=proj.id, title="Hard Task", complexity=TaskComplexity.HIGH, priority=TaskPriority.HIGH,
        estimated_hours=Decimal("20.0"), status=TaskStatus.COMPLETED, created_by=u_mgr.id, task_weight_score=Decimal("80.0")
    )
    db.add(t)
    db.commit()

    ledger = calculate_and_record_incentive_points(db, dev.id, t.id, is_on_time=True)
    assert float(ledger.base_points) == 800.0
    assert float(ledger.difficulty_bonus) == 160.0 # +20%
    assert float(ledger.on_time_bonus) == 120.0    # +15%
    assert float(ledger.total_points) >= 1080.0
