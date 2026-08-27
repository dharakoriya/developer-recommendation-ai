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
from app.models import (
    User,
    UserRole,
    DeveloperProfile,
    AvailabilityStatus,
    Project,
    Task,
    Recommendation,
    RecommendationAudit,
    RecommendationFeedback,
    RecommendationOutcome,
    RecommendationLabelValidation,
    FeedbackDecision,
    OutcomeStatus,
    LabelStatus,
    ValidationStatus,
    ReadinessStatus,
)
from app.services.outcome_dataset_service import record_recommendation_audit, submit_recommendation_feedback
from app.services.realworld_dataset_service import (
    get_realworld_observations,
    validate_observation_label,
    analyze_data_quality,
    get_class_distribution,
    compare_synthetic_vs_realworld,
    evaluate_model_training_readiness,
    export_realworld_dataset,
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


def setup_test_entities(db: Session):
    user = User(email=f"user_{uuid.uuid4().hex[:6]}@d.ai", password_hash="pass", name="RealWorld Dev", role="DEVELOPER")
    db.add(user)
    db.commit()

    dev = DeveloperProfile(user_id=user.id, experience_years=Decimal("5.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("90.0"))
    db.add(dev)
    proj = Project(name="RW Project", created_by=user.id, status="ACTIVE")
    db.add(proj)
    db.commit()

    task = Task(project_id=proj.id, title="RW Task", estimated_hours=Decimal("12.0"), created_by=user.id, priority="HIGH", complexity="MEDIUM", status="TODO")
    db.add(task)
    db.commit()

    rec = Recommendation(task_id=task.id, developer_id=dev.id, model_version="baseline-v1", score=Decimal("0.92"), rank=1)
    db.add(rec)
    db.commit()

    snapshot = {
        "dev_experience_years": 5.0,
        "dev_availability_encoded": 1.0,
        "dev_performance_score": 90.0,
        "dev_workload_score": 25.0,
        "weighted_skill_match_score": 95.0,
    }

    audit = record_recommendation_audit(db, rec, snapshot, environment="production", model_name="deterministic_baseline")
    return user, dev, proj, task, rec, audit


def test_observation_construction_and_feature_preservation(db_session: Session):
    user, dev, proj, task, rec, audit = setup_test_entities(db_session)
    observations = get_realworld_observations(db_session)

    assert len(observations) >= 1
    target = [o for o in observations if o.recommendation_id == rec.id][0]

    assert target.developer_name == "RealWorld Dev"
    assert target.task_title == "RW Task"
    assert target.feature_snapshot["dev_workload_score"] == 25.0
    assert target.label_status == LabelStatus.UNLABELED
    assert target.validation_status == ValidationStatus.UNVALIDATED


def test_weak_label_generation_and_reasoning(db_session: Session):
    user, dev, proj, task, rec, audit = setup_test_entities(db_session)

    # Submit feedback (ACCEPTED)
    fb = submit_recommendation_feedback(db_session, rec.id, user.id, FeedbackDecision.ACCEPTED, "Good candidate.")

    observations = get_realworld_observations(db_session)
    target = [o for o in observations if o.recommendation_id == rec.id][0]

    assert target.label_status == LabelStatus.WEAK_LABEL
    assert target.proposed_research_label == 1
    assert "accepted" in target.label_reason.lower()


def test_ambiguous_observation_handling(db_session: Session):
    user, dev, proj, task, rec, audit = setup_test_entities(db_session)

    # Submit IGNORED feedback
    fb = submit_recommendation_feedback(db_session, rec.id, user.id, FeedbackDecision.IGNORED, "Ignored by manager.")

    observations = get_realworld_observations(db_session)
    target = [o for o in observations if o.recommendation_id == rec.id][0]

    assert target.label_status == LabelStatus.AMBIGUOUS
    assert target.proposed_research_label is None


def test_human_label_validation_flow(db_session: Session):
    user, dev, proj, task, rec, audit = setup_test_entities(db_session)

    # Validate observation as VALIDATED_POSITIVE
    val_resp = validate_observation_label(
        db=db_session,
        audit_id=audit.id,
        validator_id=user.id,
        validation_status=ValidationStatus.VALIDATED_POSITIVE,
        validation_reason="Verified candidate expert competence.",
    )

    assert val_resp.validation_status == ValidationStatus.VALIDATED_POSITIVE
    assert val_resp.label_status == LabelStatus.VALIDATED_LABEL
    assert val_resp.proposed_research_label == 1

    # Verify via get_realworld_observations
    observations = get_realworld_observations(db_session)
    target = [o for o in observations if o.recommendation_id == rec.id][0]

    assert target.validation_status == ValidationStatus.VALIDATED_POSITIVE
    assert target.label_status == LabelStatus.VALIDATED_LABEL
    assert target.validator_name == "RealWorld Dev"


def test_data_quality_and_temporal_leakage_audit(db_session: Session):
    user, dev, proj, task, rec, audit = setup_test_entities(db_session)
    quality = analyze_data_quality(db_session)

    assert quality.total_observations >= 1
    assert quality.temporal_leakage_flag_count == 0
    assert quality.invalid_lifecycle_transition_count == 0
    assert quality.quality_score_percentage >= 90.0


def test_class_distribution_and_imbalance(db_session: Session):
    dist = get_class_distribution(db_session)
    assert dist.total_observations >= 1
    assert isinstance(dist.imbalance_description, str)


def test_synthetic_vs_realworld_comparison(db_session: Session):
    comp = compare_synthetic_vs_realworld(db_session)
    assert comp.synthetic_dataset_version == "synthetic-v1"
    assert comp.realworld_dataset_version == "realworld-v1"
    assert len(comp.feature_comparisons) > 0


def test_model_training_readiness_evaluation(db_session: Session):
    readiness = evaluate_model_training_readiness(db_session)
    assert readiness.readiness_status in (ReadinessStatus.NOT_READY, ReadinessStatus.REVIEW_REQUIRED, ReadinessStatus.READY_FOR_EXPERIMENT)
    assert len(readiness.readiness_checks) == 5


def test_realworld_dataset_exporter(db_session: Session):
    meta = export_realworld_dataset(db_session)
    assert meta.dataset_version == "realworld-v1"
    target_path = os.path.abspath(os.path.join(PROJECT_ROOT, "..", "research", "dataset", "realworld", "dataset_metadata.json"))
    assert os.path.exists(target_path)


def test_authorization_protection_on_validation_and_export(client: TestClient):
    # Unauthenticated request fails with 401
    res_val = client.post(f"/api/recommendations/research/dataset/labels/{uuid.uuid4()}/validate", json={"validation_status": "VALIDATED_POSITIVE"})
    assert res_val.status_code == 401

    res_exp = client.get("/api/recommendations/research/dataset/export")
    assert res_exp.status_code == 401
