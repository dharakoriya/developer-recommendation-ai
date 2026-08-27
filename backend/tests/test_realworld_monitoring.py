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
    DeveloperProfile,
    AvailabilityStatus,
    Project,
    Task,
    Recommendation,
    RecommendationAudit,
    RecommendationFeedback,
    RecommendationOutcome,
    RecommendationDatasetSnapshot,
    FeedbackDecision,
    OutcomeStatus,
)
from app.services.outcome_dataset_service import record_recommendation_audit, submit_recommendation_feedback
from app.services.realworld_monitoring_service import (
    get_data_collection_monitoring,
    get_dataset_growth,
    get_label_quality_monitoring,
    get_outcome_quality_funnel,
    get_dataset_diversity,
    create_dataset_snapshot,
    list_dataset_snapshots,
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


def setup_monitoring_entities(db: Session):
    user = User(email=f"mon_user_{uuid.uuid4().hex[:6]}@d.ai", password_hash="pass", name="Monitoring Dev", role="DEVELOPER")
    db.add(user)
    db.commit()

    dev = DeveloperProfile(user_id=user.id, experience_years=Decimal("6.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("92.0"))
    db.add(dev)
    proj = Project(name="Mon Project", created_by=user.id, status="ACTIVE")
    db.add(proj)
    db.commit()

    task = Task(project_id=proj.id, title="Mon Task", estimated_hours=Decimal("16.0"), created_by=user.id, priority="HIGH", complexity="MEDIUM", status="TODO")
    db.add(task)
    db.commit()

    rec = Recommendation(task_id=task.id, developer_id=dev.id, model_version="baseline-v1", score=Decimal("0.95"), rank=1)
    db.add(rec)
    db.commit()

    snapshot = {
        "dev_experience_years": 6.0,
        "dev_availability_encoded": 1.0,
        "dev_performance_score": 92.0,
        "dev_workload_score": 20.0,
        "weighted_skill_match_score": 96.0,
        "task_complexity": "MEDIUM",
        "task_priority": "HIGH",
    }

    audit = record_recommendation_audit(db, rec, snapshot, environment="production", model_name="deterministic_baseline")
    return user, dev, proj, task, rec, audit


def test_data_collection_monitoring_aggregation(db_session: Session):
    user, dev, proj, task, rec, audit = setup_monitoring_entities(db_session)
    mon = get_data_collection_monitoring(db_session)

    assert mon.total_observations >= 1
    assert mon.observations_this_week >= 1
    assert len(mon.by_model_version) >= 1
    assert len(mon.by_environment) >= 1


def test_dataset_growth_timeseries(db_session: Session):
    growth = get_dataset_growth(db_session)
    assert growth.dataset_version == "realworld-v1"
    assert len(growth.time_series) >= 1
    assert growth.time_series[-1].total_observations >= 1


def test_label_quality_monitoring_and_turnaround(db_session: Session):
    user, dev, proj, task, rec, audit = setup_monitoring_entities(db_session)
    submit_recommendation_feedback(db_session, rec.id, user.id, FeedbackDecision.ACCEPTED, "Great match!")

    lq = get_label_quality_monitoring(db_session)
    assert lq.label_coverage_percentage > 0.0
    assert isinstance(lq.anomaly_warnings, list)


def test_outcome_quality_funnel(db_session: Session):
    user, dev, proj, task, rec, audit = setup_monitoring_entities(db_session)
    submit_recommendation_feedback(db_session, rec.id, user.id, FeedbackDecision.ACCEPTED, "Verified")

    funnel = get_outcome_quality_funnel(db_session)
    assert len(funnel.funnel_stages) == 4
    assert funnel.funnel_stages[0].stage_name == "RECOMMENDED"
    assert funnel.funnel_stages[1].stage_name == "ACCEPTED"


def test_dataset_diversity_calculation(db_session: Session):
    div = get_dataset_diversity(db_session)
    assert div.unique_developers_count >= 1
    assert div.unique_tasks_count >= 1
    assert div.unique_projects_count >= 1
    assert isinstance(div.concentration_warnings, list)


def test_dataset_snapshot_creation_and_immutability(db_session: Session):
    user, dev, proj, task, rec, audit = setup_monitoring_entities(db_session)
    snap_version = f"realworld-v1.test-{uuid.uuid4().hex[:6]}"

    snap_resp = create_dataset_snapshot(db_session, version=snap_version, user_id=user.id)
    assert snap_resp.dataset_version == snap_version
    assert snap_resp.total_observations >= 1

    # Verify JSON file written to research/dataset/snapshots/
    snap_file = os.path.abspath(os.path.join(PROJECT_ROOT, "..", "research", "dataset", "snapshots", f"{snap_version}.json"))
    assert os.path.exists(snap_file)

    # Immutability Check: Duplicate version raises ValueError
    with pytest.raises(ValueError, match="already exists and is immutable"):
        create_dataset_snapshot(db_session, version=snap_version, user_id=user.id)


def test_list_dataset_snapshots(db_session: Session):
    snaps = list_dataset_snapshots(db_session)
    assert isinstance(snaps, list)


def test_monitoring_api_authorization_protection(client: TestClient):
    # Unauthenticated snapshot creation fails with 401
    res = client.post("/api/recommendations/research/dataset/snapshots", json={"dataset_version": "v-fail"})
    assert res.status_code == 401
