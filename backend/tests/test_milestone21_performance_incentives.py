import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.task import Task, TaskSkill, Assignment
from app.models.developer import DeveloperProfile, DeveloperSkill
from app.models.skill import Skill
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.enums import (
    UserRole,
    TaskPriority,
    TaskComplexity,
    TaskStatus,
    AssignmentStatus,
    AvailabilityStatus,
)
from app.models.performance import DeveloperStreak, DeveloperIncentiveLedger, DeveloperAchievement
from app.services.task_weight_service import (
    calculate_task_weight_score,
    get_task_weight_category,
    calculate_task_effort_score,
    calculate_task_skill_difficulty_score,
)
from app.services.performance_service import (
    calculate_developer_performance_metrics,
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


@pytest.fixture
def dev_user(db):
    u = User(name="Test Dev", email="testdev@example.com", password_hash="hash", role=UserRole.DEVELOPER)
    db.add(u)
    db.commit()
    dev = DeveloperProfile(user_id=u.id, experience_years=Decimal("3.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("75.0"))
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return dev


@pytest.fixture
def test_proj(db, dev_user):
    mgr = User(name="Test Mgr", email="testmgr@example.com", password_hash="hash", role=UserRole.MANAGER)
    db.add(mgr)
    db.commit()
    proj = Project(name="Test Proj", status=ProjectStatus.ACTIVE, created_by=mgr.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


def test_task_weight_engine_formula_and_categories():
    """Verify exact 40/25/20/15 task weight formula and weight categories."""
    assert calculate_task_effort_score(2.0) == 20.0
    assert calculate_task_effort_score(6.0) == 40.0
    assert calculate_task_effort_score(12.0) == 60.0
    assert calculate_task_effort_score(25.0) == 80.0
    assert calculate_task_effort_score(50.0) == 100.0

    assert get_task_weight_category(20.0) == "LIGHT"
    assert get_task_weight_category(40.0) == "MODERATE"
    assert get_task_weight_category(60.0) == "HEAVY"
    assert get_task_weight_category(85.0) == "CRITICAL"

    class DummyTask:
        complexity = TaskComplexity.LOW
        priority = TaskPriority.LOW
        estimated_hours = Decimal("2.0")
        task_skills = []

    weight = calculate_task_weight_score(DummyTask())
    assert weight == 23.25
    assert get_task_weight_category(weight) == "LIGHT"


def test_developer_streak_calendar_day_logic(db, dev_user):
    """Test developer activity streak logic for same day, consecutive day, and missed day."""
    dev_id = dev_user.id
    today = datetime.now(timezone.utc).date()

    # Day 1: First completion
    streak = update_developer_streak_on_task_completion(db, dev_id, task_weight=50.0, completion_date=today)
    assert streak.current_streak == 1
    assert streak.longest_streak == 1

    # Day 1: Second completion on same calendar day
    streak = update_developer_streak_on_task_completion(db, dev_id, task_weight=30.0, completion_date=today)
    assert streak.current_streak == 1

    # Day 2: Next consecutive calendar day
    tomorrow = today + timedelta(days=1)
    streak = update_developer_streak_on_task_completion(db, dev_id, task_weight=60.0, completion_date=tomorrow)
    assert streak.current_streak == 2
    assert streak.longest_streak == 2

    # Day 5: Missed days (gap > 1 day)
    future = today + timedelta(days=5)
    streak = update_developer_streak_on_task_completion(db, dev_id, task_weight=40.0, completion_date=future)
    assert streak.current_streak == 1
    assert streak.longest_streak == 2


def test_incentive_ledger_immutable_recording(db, dev_user, test_proj):
    """Verify incentive point calculation and double-award prevention."""
    dev_id = dev_user.id

    task = Task(
        project_id=test_proj.id,
        title="Incentive Test Task",
        complexity=TaskComplexity.HIGH,
        priority=TaskPriority.CRITICAL,
        estimated_hours=Decimal("20.0"),
        status=TaskStatus.COMPLETED,
        created_by=test_proj.created_by,
        task_weight_score=Decimal("80.0"),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    entry1 = calculate_and_record_incentive_points(db, dev_id, task.id, is_on_time=True)
    assert float(entry1.total_points) > 0.0
    assert entry1.task_id == task.id

    # Second invocation should be idempotent (return existing ledger entry)
    entry2 = calculate_and_record_incentive_points(db, dev_id, task.id, is_on_time=True)
    assert entry2.id == entry1.id
