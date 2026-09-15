import os
import sys
import uuid
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal, engine, Base
from app.config import settings, Settings
from app.models import (
    User,
    UserRole,
    DeveloperProfile,
    AvailabilityStatus,
    Project,
    Task,
    Skill,
    TaskSkill,
    DeveloperSkill,
    Recommendation,
    RecommendationAudit,
)
from app.core.security import get_password_hash, create_access_token
from app.services.recommendation_service import (
    get_active_recommendation_model,
    generate_and_persist_task_recommendations,
    get_persisted_task_recommendations,
    BaselineRecommendationModel,
    BaselineV2RecommendationModel,
)
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


def setup_switch_test_entities(db: Session):
    admin_user = User(
        email=f"switch_admin_{uuid.uuid4().hex[:6]}@devalign.ai",
        password_hash=get_password_hash("pass123"),
        name="Switch Admin",
        role=UserRole.ADMIN,
    )
    dev_user = User(
        email=f"switch_dev_{uuid.uuid4().hex[:6]}@devalign.ai",
        password_hash=get_password_hash("pass123"),
        name="Switch Developer",
        role=UserRole.DEVELOPER,
    )
    db.add_all([admin_user, dev_user])
    db.commit()

    dev_prof = DeveloperProfile(
        user_id=dev_user.id,
        experience_years=Decimal("6.0"),
        availability_status=AvailabilityStatus.AVAILABLE,
        performance_score=Decimal("92.0"),
    )
    db.add(dev_prof)

    skill = Skill(name=f"Python_{uuid.uuid4().hex[:4]}", category="Backend")
    db.add(skill)
    db.commit()

    dev_skill = DeveloperSkill(
        developer_id=dev_prof.id,
        skill_id=skill.id,
        proficiency_level=Decimal("90.0"),
    )
    db.add(dev_skill)

    proj = Project(name="Switch Project", created_by=admin_user.id, status="ACTIVE")
    db.add(proj)
    db.commit()

    task = Task(
        project_id=proj.id,
        title="Switch Model Task",
        estimated_hours=Decimal("16.0"),
        created_by=admin_user.id,
        priority="HIGH",
        complexity="MEDIUM",
        status="TODO",
    )
    db.add(task)
    db.commit()

    task_skill = TaskSkill(task_id=task.id, skill_id=skill.id, required_level=Decimal("80.0"))
    db.add(task_skill)
    db.commit()

    return admin_user, dev_prof, proj, task


def test_active_model_resolver_respects_settings(monkeypatch):
    # Test baseline-v1 resolution
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v1")
    model_v1 = get_active_recommendation_model()
    assert isinstance(model_v1, BaselineRecommendationModel)
    assert model_v1.get_model_metadata().model_version == "baseline-v1"

    # Test baseline-v2 resolution
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v2")
    model_v2 = get_active_recommendation_model()
    assert isinstance(model_v2, BaselineV2RecommendationModel)
    assert model_v2.get_model_metadata().model_version == "baseline-v2"


def test_invalid_recommendation_model_validation_fails():
    with pytest.raises(ValueError) as exc_info:
        Settings(RECOMMENDATION_MODEL="invalid_model_name_xyz")
    assert "Invalid RECOMMENDATION_MODEL" in str(exc_info.value)
    assert "baseline-v1" in str(exc_info.value)
    assert "baseline-v2" in str(exc_info.value)


def test_stored_v1_auto_regenerates_when_active_is_v2(db_session: Session, monkeypatch):
    admin, dev, proj, task = setup_switch_test_entities(db_session)

    # 1. Generate under baseline-v1
    res_v1 = generate_and_persist_task_recommendations(db_session, task.id, model_version="baseline-v1")
    assert res_v1.model_version == "baseline-v1"

    # 2. Switch active settings to baseline-v2
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v2")

    # 3. get_persisted_task_recommendations should detect version mismatch and auto-regenerate under baseline-v2
    res_v2 = get_persisted_task_recommendations(db_session, task.id)
    assert res_v2.model_version == "baseline-v2"
    assert len(res_v2.recommendations) > 0
    assert res_v2.recommendations[0].model_version == "baseline-v2"


def test_stored_v2_auto_regenerates_when_active_is_v1(db_session: Session, monkeypatch):
    admin, dev, proj, task = setup_switch_test_entities(db_session)

    # 1. Generate under baseline-v2
    res_v2 = generate_and_persist_task_recommendations(db_session, task.id, model_version="baseline-v2")
    assert res_v2.model_version == "baseline-v2"

    # 2. Switch active settings to baseline-v1
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v1")

    # 3. get_persisted_task_recommendations should detect version mismatch and auto-regenerate under baseline-v1
    res_v1 = get_persisted_task_recommendations(db_session, task.id)
    assert res_v1.model_version == "baseline-v1"
    assert len(res_v1.recommendations) > 0
    assert res_v1.recommendations[0].model_version == "baseline-v1"


def test_metadata_endpoint_matches_active_model(db_session: Session, client: TestClient, monkeypatch):
    admin, dev, proj, task = setup_switch_test_entities(db_session)
    token = create_access_token(data={"sub": str(admin.id), "role": admin.role})
    headers = {"Authorization": f"Bearer {token}"}

    # Test when v1 is active
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v1")
    resp_v1 = client.get("/api/recommendations/metadata/model", headers=headers)
    assert resp_v1.status_code == 200
    assert resp_v1.json()["model_version"] == "baseline-v1"

    # Test when v2 is active
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v2")
    resp_v2 = client.get("/api/recommendations/metadata/model", headers=headers)
    assert resp_v2.status_code == 200
    assert resp_v2.json()["model_version"] == "baseline-v2"


def test_dashboard_recommendations_metadata_matches_active_model(db_session: Session, client: TestClient, monkeypatch):
    admin, dev, proj, task = setup_switch_test_entities(db_session)
    token = create_access_token(data={"sub": str(admin.id), "role": admin.role})
    headers = {"Authorization": f"Bearer {token}"}

    # Test v1
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v1")
    resp_v1 = client.get("/api/dashboard/recommendations", headers=headers)
    assert resp_v1.status_code == 200
    assert resp_v1.json()["active_model_version"] == "baseline-v1"

    # Test v2
    monkeypatch.setattr(settings, "RECOMMENDATION_MODEL", "baseline-v2")
    resp_v2 = client.get("/api/dashboard/recommendations", headers=headers)
    assert resp_v2.status_code == 200
    assert resp_v2.json()["active_model_version"] == "baseline-v2"
