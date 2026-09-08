import os
import sys
import uuid
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal
from app.models.recommendation import Recommendation
from app.models.recommendation_audit import RecommendationAudit, RecommendationFeedback, RecommendationOutcome
from app.models.enums import FeedbackDecision, OutcomeStatus, AvailabilityStatus
from app.services.outcome_dataset_service import (
    record_recommendation_audit,
    submit_recommendation_feedback,
    get_observational_dataset_preview,
)
from app.services.model_governance_service import get_model_registry_governance
from app.services.recommendation_service import get_active_recommendation_model


from app.database import SessionLocal, engine, Base
from app.models import User, DeveloperProfile, Project, Task  # Ensures all models are registered


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_model_registry_governance():
    models = get_model_registry_governance()
    assert len(models) == 3

    prod_models = [m for m in models if m.environment == "production"]
    res_models = [m for m in models if m.environment == "research"]

    assert len(prod_models) == 1
    assert prod_models[0].model_name == "deterministic_baseline"
    assert prod_models[0].model_version == "baseline-v1"
    assert prod_models[0].status == "PRODUCTION_ACTIVE"

    assert len(res_models) == 2
    assert res_models[0].model_version == "ml-v1-rf-xgb"
    assert res_models[0].status == "EXPERIMENTAL"


def test_audit_record_creation_and_feature_snapshot(db_session: Session):
    # Setup parent database entities
    user = User(email=f"user_{uuid.uuid4().hex[:6]}@d.ai", password_hash="pass", name="Audit Dev", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()

    dev = DeveloperProfile(user_id=user.id, experience_years=Decimal("4.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("85.0"))
    db_session.add(dev)
    proj = Project(name="Audit Project", created_by=user.id, status="ACTIVE")
    db_session.add(proj)
    db_session.commit()

    task = Task(project_id=proj.id, title="Audit Task", estimated_hours=10.0, created_by=user.id, priority="MEDIUM", complexity="MEDIUM", status="TODO")
    db_session.add(task)
    db_session.commit()

    dummy_snapshot = {
        "dev_experience_years": 5.0,
        "dev_availability_encoded": 1.0,
        "dev_performance_score": 90.0,
        "weighted_skill_match_score": 100.0,
    }

    dummy_rec = Recommendation(
        task_id=task.id,
        developer_id=dev.id,
        model_version="baseline-v1",
        score=0.85,
        rank=1,
    )
    db_session.add(dummy_rec)
    db_session.commit()

    audit = record_recommendation_audit(
        db=db_session,
        recommendation=dummy_rec,
        feature_snapshot=dummy_snapshot,
        environment="production",
        model_name="deterministic_baseline",
    )

    assert audit is not None
    assert audit.recommendation_id == dummy_rec.id
    assert audit.environment == "production"
    assert audit.feature_snapshot["weighted_skill_match_score"] == 100.0


def test_human_feedback_submission(db_session: Session):
    user = User(email=f"user_{uuid.uuid4().hex[:6]}@d.ai", password_hash="pass", name="FB Dev", role="DEVELOPER")
    db_session.add(user)
    db_session.commit()

    dev = DeveloperProfile(user_id=user.id, experience_years=Decimal("4.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("85.0"))
    db_session.add(dev)
    proj = Project(name="FB Project", created_by=user.id, status="ACTIVE")
    db_session.add(proj)
    db_session.commit()

    task = Task(project_id=proj.id, title="FB Task", estimated_hours=10.0, created_by=user.id, priority="MEDIUM", complexity="MEDIUM", status="TODO")
    db_session.add(task)
    db_session.commit()

    dummy_rec = Recommendation(
        task_id=task.id,
        developer_id=dev.id,
        model_version="baseline-v1",
        score=0.90,
        rank=1,
    )
    db_session.add(dummy_rec)
    db_session.commit()

    # Submit feedback
    fb = submit_recommendation_feedback(
        db=db_session,
        recommendation_id=dummy_rec.id,
        reviewer_id=user.id,
        decision=FeedbackDecision.ACCEPTED,
        comment="Strong developer skill match.",
    )

    assert fb is not None
    assert fb.decision == FeedbackDecision.ACCEPTED
    assert fb.comment == "Strong developer skill match."


def test_observational_dataset_preview_metrics(db_session: Session):
    preview = get_observational_dataset_preview(db_session)
    assert preview is not None
    assert preview.real_world_ml_training_readiness is False
    assert "baseline-v1" in preview.disclaimer or "ground truth" in preview.disclaimer


def test_production_baseline_isolation():
    active_model = get_active_recommendation_model()
    meta = active_model.get_model_metadata()

    # Verify baseline-v2 is active in production
    assert meta.model_type == "deterministic_baseline"
    assert meta.model_version == "baseline-v2"

