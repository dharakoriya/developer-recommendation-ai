import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models.user import User
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile, WorkloadRecord, DeveloperSkill
from app.models.skill import Skill
from app.models.task import Task, Assignment
from app.models.recommendation import Recommendation
from app.models.recommendation_audit import RecommendationAudit, RecommendationOutcome
from app.models.enums import UserRole, TaskStatus, TaskPriority, TaskComplexity, AvailabilityStatus, AssignmentStatus
from app.core.security import create_access_token, get_password_hash
from app.services.task_weight_service import calculate_task_weight_score
from app.services.performance_service import calculate_and_record_incentive_points

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db

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
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def admin_user(db_session: Session):
    email = f"admin_m23_{uuid.uuid4().hex[:6]}@example.com"
    user = User(
        name="Admin M23",
        email=email,
        password_hash=get_password_hash("password123"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def developer_user(db_session: Session):
    email = f"dev_m23_{uuid.uuid4().hex[:6]}@example.com"
    user = User(
        name="Dev M23",
        email=email,
        password_hash=get_password_hash("password123"),
        role=UserRole.DEVELOPER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    dev_profile = DeveloperProfile(
        user_id=user.id,
        experience_years=5,
        availability_status=AvailabilityStatus.AVAILABLE,
        performance_score=Decimal("85.0"),
    )
    db_session.add(dev_profile)
    db_session.commit()
    db_session.refresh(dev_profile)
    return user, dev_profile


def test_task_status_lifecycle_and_reopen(client, db_session: Session, admin_user: User):
    token = create_access_token(data={"sub": str(admin_user.id), "role": admin_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Project & Team
    proj = Project(name="M23 Workflow Proj", status="ACTIVE", created_by=admin_user.id)
    db_session.add(proj)
    db_session.commit()

    team = Team(name="M23 Team", project_id=proj.id)
    db_session.add(team)
    db_session.commit()

    # 2. Create Task
    task = Task(
        title="Payment Gateway API",
        project_id=proj.id,
        team_id=team.id,
        status=TaskStatus.TODO,
        priority=TaskPriority.HIGH,
        complexity=TaskComplexity.HIGH,
        estimated_hours=Decimal("20.0"),
        task_weight_score=Decimal("70.0"),
        created_by=admin_user.id,
    )
    db_session.add(task)
    db_session.commit()

    # 3. Valid transition: TODO -> READY
    res = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "READY"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "READY"

    # 4. Valid transition: READY -> IN_PROGRESS
    res = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"

    # 5. Invalid transition: IN_PROGRESS -> TODO (must fail)
    res = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "TODO"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Invalid status transition" in res.json()["detail"]

    # 6. Valid transition: IN_PROGRESS -> COMPLETED
    res = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "COMPLETED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"

    # 7. Transition from COMPLETED to IN_PROGRESS directly fails
    res = client.patch(
        f"/api/tasks/{task.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=headers,
    )
    assert res.status_code == 400

    # 8. Reopen task endpoint works explicitly
    res = client.post(
        f"/api/tasks/{task.id}/reopen",
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "TODO"


def test_assignment_workflow_workload_and_override(client, db_session: Session, admin_user: User, developer_user):
    dev_user, dev_profile = developer_user
    token = create_access_token(data={"sub": str(admin_user.id), "role": admin_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    proj = Project(name="M23 Assignment Proj", status="ACTIVE", created_by=admin_user.id)
    db_session.add(proj)
    db_session.commit()

    task = Task(
        title="Heavy System Refactor",
        project_id=proj.id,
        status=TaskStatus.TODO,
        priority=TaskPriority.CRITICAL,
        complexity=TaskComplexity.HIGH,
        estimated_hours=Decimal("40.0"),
        task_weight_score=Decimal("85.0"),
        created_by=admin_user.id,
    )
    db_session.add(task)
    db_session.commit()

    # Initial Workload = 80%
    wl = WorkloadRecord(
        developer_id=dev_profile.id,
        workload_score=Decimal("80.0"),
        active_task_count=2,
        estimated_hours=Decimal("32.0"),
        availability_factor=Decimal("1.0"),
    )
    db_session.add(wl)
    db_session.commit()

    # Assigning 40h task (+100% impact) -> Projected Workload 180% > 100%
    # Attempt without force_override should return 400 Bad Request requiring override
    res = client.post(
        f"/api/tasks/{task.id}/assign",
        json={
            "developer_id": str(dev_profile.id),
            "selection_reason": "Top candidate",
        },
        headers=headers,
    )
    assert res.status_code == 400
    res_data = res.json()
    assert res_data["detail"]["requires_override"] is True

    # With force_override and override_reason -> Should succeed
    res = client.post(
        f"/api/tasks/{task.id}/assign",
        json={
            "developer_id": str(dev_profile.id),
            "selection_reason": "Top candidate",
            "override_reason": "Client preference urgency",
            "force_override": True,
        },
        headers=headers,
    )
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["developer_id"] == str(dev_profile.id)
    assert data["status"] == "ACTIVE"


def test_incentive_idempotency(db_session: Session, admin_user: User, developer_user):
    dev_user, dev_profile = developer_user

    proj = Project(name="M23 Incentive Proj", status="ACTIVE", created_by=admin_user.id)
    db_session.add(proj)
    db_session.commit()

    task = Task(
        title="Idempotency Audit Task",
        project_id=proj.id,
        status=TaskStatus.COMPLETED,
        priority=TaskPriority.MEDIUM,
        complexity=TaskComplexity.MEDIUM,
        estimated_hours=Decimal("10.0"),
        task_weight_score=Decimal("50.0"),
        created_by=admin_user.id,
    )
    db_session.add(task)
    db_session.commit()

    # Record incentive points first time
    entry1 = calculate_and_record_incentive_points(db_session, dev_profile.id, task.id, is_on_time=True)
    assert entry1 is not None

    # Record incentive points second time (should return existing entry without creating new row)
    entry2 = calculate_and_record_incentive_points(db_session, dev_profile.id, task.id, is_on_time=True)
    assert entry1.id == entry2.id


def test_developer_role_isolation_rbac(client, db_session: Session, admin_user: User, developer_user):
    dev_user, dev_profile = developer_user
    token = create_access_token(data={"sub": str(dev_user.id), "role": UserRole.DEVELOPER.value})
    headers = {"Authorization": f"Bearer {token}"}

    # Developer should be allowed to view /api/dashboard/summary
    res = client.get("/api/dashboard/summary", headers=headers)
    assert res.status_code == 200

    # Developer attempting to view global task recommendations should fail with 403 Forbidden
    fake_task_id = str(uuid.uuid4())
    res = client.get(f"/api/recommendations/tasks/{fake_task_id}", headers=headers)
    assert res.status_code == 403
