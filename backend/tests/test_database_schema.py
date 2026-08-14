import uuid
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, StatementError

from app.database import Base
from app.models import (
    User,
    UserRole,
    DeveloperProfile,
    AvailabilityStatus,
    Skill,
    DeveloperSkill,
    Project,
    ProjectStatus,
    Team,
    TeamMember,
    Task,
    TaskPriority,
    TaskComplexity,
    TaskStatus,
    TaskSkill,
    Assignment,
    AssignmentStatus,
    Recommendation,
    RecommendationExplanation,
    ShapDirection,
    WorkloadRecord,
)

# Use SQLite in-memory engine for fast ORM metadata and constraint testing
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def test_all_tables_created(db_session):
    """Verify all 13 expected tables exist in database metadata."""
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    expected_tables = [
        "users",
        "developer_profiles",
        "skills",
        "developer_skills",
        "projects",
        "teams",
        "team_members",
        "tasks",
        "task_skills",
        "assignments",
        "recommendations",
        "recommendation_explanations",
        "workload_records",
    ]
    for table in expected_tables:
        assert table in tables, f"Table '{table}' missing from database schema."


def test_user_creation_and_defaults(db_session):
    """Test user creation with default UUID and timestamp generation."""
    user = User(
        name="Test Manager",
        email="manager@devalign.ai",
        password_hash="hashed_secret_password",
        role=UserRole.MANAGER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert isinstance(user.id, uuid.UUID)
    assert user.name == "Test Manager"
    assert user.email == "manager@devalign.ai"
    assert user.role == UserRole.MANAGER
    assert user.is_active is True
    assert user.created_at is not None


def test_user_email_unique_constraint(db_session):
    """Verify unique constraint on user email."""
    user1 = User(
        name="User One",
        email="duplicate@devalign.ai",
        password_hash="pass1",
        role=UserRole.DEVELOPER,
    )
    user2 = User(
        name="User Two",
        email="duplicate@devalign.ai",
        password_hash="pass2",
        role=UserRole.DEVELOPER,
    )
    db_session.add(user1)
    db_session.commit()

    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_developer_profile_relationship(db_session):
    """Test User -> DeveloperProfile 1-to-1 relationship."""
    user = User(
        name="Dev One",
        email="dev1@devalign.ai",
        password_hash="secret",
        role=UserRole.DEVELOPER,
    )
    db_session.add(user)
    db_session.commit()

    profile = DeveloperProfile(
        user_id=user.id,
        experience_years=Decimal("5.5"),
        availability_status=AvailabilityStatus.AVAILABLE,
        performance_score=Decimal("88.50"),
    )
    db_session.add(profile)
    db_session.commit()

    fetched_user = db_session.execute(
        select(User).where(User.email == "dev1@devalign.ai")
    ).scalar_one()

    assert fetched_user.developer_profile is not None
    assert fetched_user.developer_profile.experience_years == Decimal("5.5")
    assert fetched_user.developer_profile.availability_status == AvailabilityStatus.AVAILABLE


def test_developer_skill_unique_constraint(db_session):
    """Verify developer_id + skill_id unique constraint."""
    user = User(name="Dev", email="dev@devalign.ai", password_hash="p", role=UserRole.DEVELOPER)
    skill = Skill(name="Python", category="Backend")
    db_session.add_all([user, skill])
    db_session.commit()

    profile = DeveloperProfile(
        user_id=user.id,
        experience_years=Decimal("3.0"),
        availability_status=AvailabilityStatus.AVAILABLE,
    )
    db_session.add(profile)
    db_session.commit()

    ds1 = DeveloperSkill(
        developer_id=profile.id,
        skill_id=skill.id,
        proficiency_level=Decimal("85.00"),
    )
    db_session.add(ds1)
    db_session.commit()

    ds2 = DeveloperSkill(
        developer_id=profile.id,
        skill_id=skill.id,
        proficiency_level=Decimal("90.00"),
    )
    db_session.add(ds2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_task_skills_and_check_constraints(db_session):
    """Verify Task creation and required_level check constraint."""
    manager = User(name="Mgr", email="mgr@devalign.ai", password_hash="p", role=UserRole.MANAGER)
    db_session.add(manager)
    db_session.commit()

    project = Project(
        name="DevAlign Core",
        description="Main AI Project",
        status=ProjectStatus.ACTIVE,
        created_by=manager.id,
    )
    db_session.add(project)
    db_session.commit()

    task = Task(
        project_id=project.id,
        title="Build ML API",
        description="FastAPI endpoint",
        category="Backend",
        priority=TaskPriority.HIGH,
        complexity=TaskComplexity.HIGH,
        estimated_hours=Decimal("40.00"),
        status=TaskStatus.TODO,
        created_by=manager.id,
    )
    db_session.add(task)
    db_session.commit()

    skill = Skill(name="FastAPI", category="Framework")
    db_session.add(skill)
    db_session.commit()

    task_skill = TaskSkill(
        task_id=task.id,
        skill_id=skill.id,
        required_level=Decimal("80.00"),
    )
    db_session.add(task_skill)
    db_session.commit()

    assert task.task_skills[0].skill.name == "FastAPI"
    assert task.task_skills[0].required_level == Decimal("80.00")


def test_recommendation_and_explanation_hierarchy(db_session):
    """Test full hierarchy: Task -> Recommendation -> RecommendationExplanation."""
    mgr = User(name="Manager", email="m@devalign.ai", password_hash="p", role=UserRole.MANAGER)
    dev_user = User(name="Dev", email="d@devalign.ai", password_hash="p", role=UserRole.DEVELOPER)
    db_session.add_all([mgr, dev_user])
    db_session.commit()

    dev_profile = DeveloperProfile(
        user_id=dev_user.id,
        experience_years=Decimal("4.0"),
        availability_status=AvailabilityStatus.AVAILABLE,
    )
    project = Project(name="Proj", status=ProjectStatus.ACTIVE, created_by=mgr.id)
    db_session.add_all([dev_profile, project])
    db_session.commit()

    task = Task(
        project_id=project.id,
        title="Task 101",
        priority=TaskPriority.MEDIUM,
        complexity=TaskComplexity.MEDIUM,
        estimated_hours=Decimal("16.00"),
        status=TaskStatus.TODO,
        created_by=mgr.id,
    )
    db_session.add(task)
    db_session.commit()

    rec = Recommendation(
        task_id=task.id,
        developer_id=dev_profile.id,
        model_version="xgb_v1",
        score=Decimal("0.923400"),
        rank=1,
    )
    db_session.add(rec)
    db_session.commit()

    explanation = RecommendationExplanation(
        recommendation_id=rec.id,
        feature_name="skill_match",
        feature_value="92%",
        shap_value=Decimal("0.31000000"),
        direction=ShapDirection.POSITIVE,
    )
    db_session.add(explanation)
    db_session.commit()

    fetched_rec = db_session.execute(
        select(Recommendation).where(Recommendation.id == rec.id)
    ).scalar_one()

    assert fetched_rec.rank == 1
    assert len(fetched_rec.explanations) == 1
    assert fetched_rec.explanations[0].feature_name == "skill_match"
    assert fetched_rec.explanations[0].direction == ShapDirection.POSITIVE


def test_workload_record_creation(db_session):
    """Test WorkloadRecord snapshot creation."""
    user = User(name="Dev W", email="w@devalign.ai", password_hash="p", role=UserRole.DEVELOPER)
    db_session.add(user)
    db_session.commit()

    profile = DeveloperProfile(
        user_id=user.id,
        experience_years=Decimal("2.0"),
        availability_status=AvailabilityStatus.AVAILABLE,
    )
    db_session.add(profile)
    db_session.commit()

    workload = WorkloadRecord(
        developer_id=profile.id,
        workload_score=Decimal("78.50"),
        active_task_count=3,
        estimated_hours=Decimal("24.00"),
        availability_factor=Decimal("0.80"),
    )
    db_session.add(workload)
    db_session.commit()

    assert workload.workload_score == Decimal("78.50")
    assert workload.active_task_count == 3
