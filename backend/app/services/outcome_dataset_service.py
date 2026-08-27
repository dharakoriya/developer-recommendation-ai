import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.recommendation import Recommendation
from app.models.recommendation_audit import RecommendationAudit, RecommendationFeedback, RecommendationOutcome
from app.models.task import Task, Assignment
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import FeedbackDecision, OutcomeStatus, LabelStatus
from app.schemas.recommendation_audit import DatasetPreviewMetricsResponse, RecommendationAuditResponse, RecommendationFeedbackResponse, RecommendationOutcomeResponse


def record_recommendation_audit(
    db: Session,
    recommendation: Recommendation,
    feature_snapshot: Dict[str, Any],
    environment: str = "production",
    model_name: str = "deterministic_baseline",
) -> RecommendationAudit:
    """
    Creates an immutable audit record for a generated recommendation.
    Preserves feature snapshot to prevent temporal data leakage.
    """
    # Fetch task and project
    task = db.scalar(select(Task).where(Task.id == recommendation.task_id))
    project_id = task.project_id if task else uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Ensure feature_snapshot is JSON-serializable
    clean_snapshot = {}
    if isinstance(feature_snapshot, dict):
        for k, v in feature_snapshot.items():
            if isinstance(v, (uuid.UUID, datetime)):
                clean_snapshot[k] = str(v)
            elif hasattr(v, "value"):
                clean_snapshot[k] = v.value
            else:
                clean_snapshot[k] = v

    audit = RecommendationAudit(
        recommendation_id=recommendation.id,
        developer_id=recommendation.developer_id,
        task_id=recommendation.task_id,
        project_id=project_id,
        rank=recommendation.rank,
        recommendation_score=recommendation.score,
        model_name=model_name,
        model_version=recommendation.model_version,
        environment=environment,
        feature_snapshot=clean_snapshot,
    )
    db.add(audit)

    # Check if outcome record exists, else initialize
    existing_outcome = db.scalar(
        select(RecommendationOutcome).where(RecommendationOutcome.recommendation_id == recommendation.id)
    )
    if not existing_outcome:
        outcome = RecommendationOutcome(
            recommendation_id=recommendation.id,
            developer_id=recommendation.developer_id,
            task_id=recommendation.task_id,
            was_assigned=False,
            assignment_outcome_status=OutcomeStatus.RECOMMENDED,
        )
        db.add(outcome)

    db.commit()
    db.refresh(audit)
    return audit


def submit_recommendation_feedback(
    db: Session,
    recommendation_id: uuid.UUID,
    reviewer_id: Optional[uuid.UUID],
    decision: FeedbackDecision,
    comment: Optional[str] = None,
) -> RecommendationFeedback:
    """
    Records human reviewer feedback for a recommendation.
    Updates outcome lifecycle to ACCEPTED if decision is ACCEPTED (without assuming assigned).
    """
    rec = db.scalar(select(Recommendation).where(Recommendation.id == recommendation_id))
    if not rec:
        raise ValueError(f"Recommendation {recommendation_id} not found.")

    feedback = RecommendationFeedback(
        recommendation_id=recommendation_id,
        reviewer_id=reviewer_id,
        decision=decision,
        comment=comment,
    )
    db.add(feedback)

    # Update Outcome lifecycle event
    outcome = db.scalar(
        select(RecommendationOutcome).where(RecommendationOutcome.recommendation_id == recommendation_id)
    )
    if outcome and decision == FeedbackDecision.ACCEPTED and outcome.assignment_outcome_status == OutcomeStatus.RECOMMENDED:
        outcome.assignment_outcome_status = OutcomeStatus.ACCEPTED

    db.commit()
    db.refresh(feedback)
    return feedback


def update_assignment_outcome(
    db: Session,
    assignment: Assignment,
) -> Optional[RecommendationOutcome]:
    """
    Links a new TaskAssignment to its matching recommendation outcome (if existing).
    """
    outcome = db.scalar(
        select(RecommendationOutcome).where(
            RecommendationOutcome.task_id == assignment.task_id,
            RecommendationOutcome.developer_id == assignment.developer_id,
        ).order_by(desc(RecommendationOutcome.created_at))
    )

    if outcome:
        outcome.was_assigned = True
        outcome.assignment_id = assignment.id
        outcome.assignment_created_at = assignment.created_at
        outcome.assignment_outcome_status = OutcomeStatus.ASSIGNED
        if assignment.status.value == "COMPLETED":
            outcome.assignment_outcome_status = OutcomeStatus.COMPLETED
            outcome.completed_at = assignment.updated_at
        db.commit()
        db.refresh(outcome)

    return outcome


def get_observational_dataset_preview(db: Session) -> DatasetPreviewMetricsResponse:
    """
    Calculates observational dataset statistics and real-world ML dataset training readiness.
    Enforces strict label_status classification (UNLABELED, WEAK_LABEL, VALIDATED_LABEL).
    """
    total_audits = db.scalar(select(func.count(RecommendationAudit.id))) or 0
    total_feedbacks = db.scalar(select(func.count(RecommendationFeedback.id))) or 0
    total_outcomes = db.scalar(select(func.count(RecommendationOutcome.id))) or 0
    assigned_outcomes = db.scalar(
        select(func.count(RecommendationOutcome.id)).where(RecommendationOutcome.was_assigned == True)
    ) or 0
    completed_outcomes = db.scalar(
        select(func.count(RecommendationOutcome.id)).where(RecommendationOutcome.assignment_outcome_status == OutcomeStatus.COMPLETED)
    ) or 0

    # Label status breakdown
    # WEAK_LABEL: Human feedback provided OR assigned without completion outcome
    # VALIDATED_LABEL: Task completed with outcome data
    # UNLABELED: No feedback and no assignment outcome
    validated_labels = completed_outcomes
    weak_labels = max(0, total_feedbacks + assigned_outcomes - completed_outcomes)
    unlabeled_obs = max(0, total_audits - weak_labels - validated_labels)

    # Readiness threshold: Needs at least 200 validated real-world outcomes to attempt real-world ML training
    is_ready = validated_labels >= 200

    if is_ready:
        assessment = f"Sufficient real-world outcome observations ({validated_labels} validated labels) available for real-world ML model training."
    else:
        assessment = f"Insufficient real-world outcome observations ({validated_labels}/200 validated labels). Continue collecting production usage evidence. Do NOT train real-world ML model yet."

    disclaimer = "Real-world observations are currently collected under baseline-v1 operation. Observed human feedback and assignment outcomes must not automatically be treated as ground truth."

    return DatasetPreviewMetricsResponse(
        total_recommendations=total_audits,
        total_feedbacks=total_feedbacks,
        total_assignments=assigned_outcomes,
        completed_assignments=completed_outcomes,
        observations_with_outcomes=total_outcomes,
        labeled_observations=weak_labels + validated_labels,
        unlabeled_observations=unlabeled_obs,
        weak_labels=weak_labels,
        validated_labels=validated_labels,
        real_world_ml_training_readiness=is_ready,
        readiness_assessment=assessment,
        disclaimer=disclaimer,
    )
