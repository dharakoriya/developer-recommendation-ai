import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.project import Project
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.skill import Skill
from app.models.task import Task
from app.models.ai_planning import AIProjectPlan, AIProjectPlanTask
from app.models.enums import UserRole, AIPlanStatus, AIPlanTaskStatus, TaskPriority, TaskComplexity
from app.core.security import create_access_token, get_password_hash
from app.services.ai_planning_provider import MockPlanningProvider
from app.services.ai_planning_dependency_service import validate_task_dependencies
from app.schemas.ai_planning import AIPlanningInput

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
    user = User(
        name="Admin Planner",
        email=f"admin_plan_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def dev_user(db_session: Session):
    user = User(
        name="Dev User",
        email=f"dev_plan_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.DEVELOPER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_mock_ai_provider_generation():
    provider = MockPlanningProvider()
    input_data = AIPlanningInput(
        project_name="E-Commerce AI Platform",
        project_description="Build a high performance e-commerce platform with stripe checkout and python backend.",
        project_type="E_COMMERCE",
        granularity="BALANCED",
    )
    result = provider.generate_project_plan(input_data)
    assert result is not None
    assert result["ai_provider"] in ("mock", "heuristic")
    assert len(result["tasks"]) >= 5
    assert "summary" in result


def test_dependency_dag_validation():
    # Valid DAG
    tasks_valid = [
        {"title": "DB Design", "dependencies": []},
        {"title": "API Backend", "dependencies": ["DB Design"]},
        {"title": "Frontend UI", "dependencies": ["API Backend"]},
    ]
    res_valid = validate_task_dependencies(tasks_valid)
    assert res_valid["is_valid"] is True

    # Self dependency
    tasks_self = [{"title": "Self Task", "dependencies": ["Self Task"]}]
    res_self = validate_task_dependencies(tasks_self)
    assert res_self["is_valid"] is False

    # Circular dependency
    tasks_cycle = [
        {"title": "Task A", "dependencies": ["Task B"]},
        {"title": "Task B", "dependencies": ["Task A"]},
    ]
    res_cycle = validate_task_dependencies(tasks_cycle)
    assert res_cycle["is_valid"] is False


def test_ai_planning_api_full_lifecycle(client, db_session: Session, admin_user: User):
    token = create_access_token(data={"sub": str(admin_user.id), "role": admin_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Generate Plan Draft
    input_payload = {
        "project_name": "Smart FinTech Hub",
        "project_description": "Build a secure payment and authentication system using Python and FastAPI.",
        "project_type": "WEB_APP",
        "granularity": "BALANCED",
    }
    res = client.post("/api/ai-planning/plans", json=input_payload, headers=headers)
    assert res.status_code == 201, res.text
    plan_data = res.json()
    plan_id = plan_data["id"]
    assert plan_data["status"] == "DRAFT"
    assert len(plan_data["tasks"]) > 0

    # 2. List Plans
    res = client.get("/api/ai-planning/plans", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 3. Edit a proposed task
    first_task = plan_data["tasks"][0]
    task_id = first_task["id"]
    res = client.put(
        f"/api/ai-planning/plans/{plan_id}/tasks/{task_id}",
        json={"title": "Custom DB Schema Title", "estimated_hours": 30.0, "priority": "CRITICAL"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Custom DB Schema Title"
    assert res.json()["estimated_hours"] == 30.0

    # 4. Add a manual task
    res = client.post(
        f"/api/ai-planning/plans/{plan_id}/tasks",
        json={"title": "Manual Performance Audit Task", "estimated_hours": 12.0, "module": "QA"},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["is_manually_added"] is True

    # 5. Get Capability Analysis
    res = client.get(f"/api/ai-planning/plans/{plan_id}/capability-analysis", headers=headers)
    assert res.status_code == 200
    cap_data = res.json()
    assert "total_generated_tasks" in cap_data
    assert "well_supported_count" in cap_data

    # 6. Apply Plan Atomically
    apply_payload = {
        "create_new_project": True,
        "skill_resolutions": [],
    }
    res = client.post(f"/api/ai-planning/plans/{plan_id}/apply", json=apply_payload, headers=headers)
    assert res.status_code == 200, res.text
    apply_data = res.json()
    assert apply_data["created_tasks_count"] > 0

    # Verify plan status changed to APPLIED
    res = client.get(f"/api/ai-planning/plans/{plan_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "APPLIED"


def test_ai_planning_developer_rbac_forbidden(client, db_session: Session, dev_user: User):
    token = create_access_token(data={"sub": str(dev_user.id), "role": dev_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    # Developer attempting to create AI plan draft must fail with HTTP 403 Forbidden
    res = client.post(
        "/api/ai-planning/plans",
        json={"project_name": "Forbidden Project", "project_description": "Testing developer RBAC guard."},
        headers=headers,
    )
    assert res.status_code == 403


def test_apply_ai_project_plan_with_duplicate_and_mapped_skills(client, db_session: Session, admin_user: User):
    token = create_access_token(data={"sub": str(admin_user.id), "role": admin_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Seed existing skill in DB
    existing_skill = Skill(name="Python", category="Backend")
    db_session.add(existing_skill)
    db_session.commit()
    db_session.refresh(existing_skill)

    # 2. Create AI Plan Draft
    input_payload = {
        "project_name": "Multi Skill Deduplication Test",
        "project_description": "Testing that duplicate and mapped skills do not violate uq_task_skill.",
        "project_type": "WEB_APP",
        "granularity": "BALANCED",
    }
    res = client.post("/api/ai-planning/plans", json=input_payload, headers=headers)
    assert res.status_code == 201, res.text
    plan_id = res.json()["id"]

    # 3. Add a manual task that has duplicate skills and aliases
    res = client.post(
        f"/api/ai-planning/plans/{plan_id}/tasks",
        json={
            "title": "Backend Core Microservice",
            "estimated_hours": 16.0,
            "module": "Backend",
            "required_skills": ["Python", "python", "PyBackend", "py-framework"],
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    added_task_id = res.json()["id"]

    # 4. Apply Plan with resolutions mapping PyBackend and py-framework to existing Python skill
    apply_payload = {
        "create_new_project": True,
        "skill_resolutions": [
            {
                "skill_name": "PyBackend",
                "action": "MAP_EXISTING",
                "mapped_existing_skill_id": str(existing_skill.id),
            },
            {
                "skill_name": "py-framework",
                "action": "MAP_EXISTING",
                "mapped_existing_skill_id": str(existing_skill.id),
            },
        ],
    }
    res = client.post(f"/api/ai-planning/plans/{plan_id}/apply", json=apply_payload, headers=headers)
    assert res.status_code == 200, res.text
    apply_data = res.json()
    assert apply_data["created_tasks_count"] > 0

    # 5. Verify the created tasks and that no duplicate (task_id, skill_id) exists
    from app.models.task import TaskSkill
    created_task_ids = [uuid.UUID(tid) for tid in apply_data["created_task_ids"]]
    task_skills = db_session.query(TaskSkill).filter(TaskSkill.task_id.in_(created_task_ids)).all()
    # Check that each (task_id, skill_id) pair is strictly unique
    pairs = [(ts.task_id, ts.skill_id) for ts in task_skills]
    assert len(pairs) == len(set(pairs)), "Found duplicate (task_id, skill_id) pairs in created TaskSkills!"

