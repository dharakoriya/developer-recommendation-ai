import os
import csv
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, desc

from app.models.recommendation_audit import RecommendationAudit, RecommendationFeedback, RecommendationOutcome
from app.models.recommendation_validation import RecommendationLabelValidation
from app.models.user import User
from app.models.developer import DeveloperProfile
from app.models.task import Task, Assignment
from app.models.enums import (
    FeedbackDecision,
    OutcomeStatus,
    LabelStatus,
    ValidationStatus,
    ReadinessStatus,
)
from app.schemas.realworld_dataset import (
    RealworldObservationResponse,
    LabelValidationResponse,
    DataQualityReportResponse,
    ClassDistributionResponse,
    DatasetComparisonResponse,
    FeatureDistributionStats,
    RealworldTrainingReadinessResponse,
    MultiCriteriaReadinessCheck,
    DatasetExportMetadataResponse,
)


def propose_research_label(
    audit: RecommendationAudit,
    feedback: Optional[RecommendationFeedback],
    outcome: Optional[RecommendationOutcome],
) -> Tuple[Optional[int], LabelStatus, str]:
    """
    Applies explicit deterministic weak research labeling rules to observational evidence.
    Differentiates WEAK_LABEL from VALIDATED_LABEL and handles AMBIGUOUS / UNLABELED states.
    """
    if feedback:
        if feedback.decision == FeedbackDecision.REJECTED:
            return 0, LabelStatus.WEAK_LABEL, "Recommendation explicitly rejected by human reviewer."
        if feedback.decision in (FeedbackDecision.IGNORED, FeedbackDecision.DEFERRED):
            return None, LabelStatus.AMBIGUOUS, f"Reviewer decision was {feedback.decision.value}; outcome ambiguous."

    if outcome:
        if outcome.assignment_outcome_status == OutcomeStatus.COMPLETED:
            return 1, LabelStatus.WEAK_LABEL, "Recommended developer was assigned and successfully completed the task."
        if outcome.was_assigned:
            return 1, LabelStatus.WEAK_LABEL, "Recommended developer was assigned and task is currently in progress."

    if feedback and feedback.decision == FeedbackDecision.ACCEPTED:
        return 1, LabelStatus.WEAK_LABEL, "Recommendation accepted by human reviewer."

    return None, LabelStatus.UNLABELED, "Awaiting human review decision or task assignment outcome."


def get_or_create_label_validation(
    db: Session,
    audit: RecommendationAudit,
    feedback: Optional[RecommendationFeedback],
    outcome: Optional[RecommendationOutcome],
) -> RecommendationLabelValidation:
    """
    Gets existing RecommendationLabelValidation record or creates a new one with proposed research label.
    """
    val = db.scalar(
        select(RecommendationLabelValidation).where(
            RecommendationLabelValidation.recommendation_audit_id == audit.id
        )
    )
    if val:
        return val

    proposed_label, status, reason = propose_research_label(audit, feedback, outcome)
    obs_id = f"obs-{str(audit.id)[:8]}"

    val = RecommendationLabelValidation(
        recommendation_audit_id=audit.id,
        observation_id=obs_id,
        proposed_research_label=proposed_label,
        label_status=status,
        label_reason=reason,
        validation_status=ValidationStatus.UNVALIDATED,
    )
    db.add(val)
    db.commit()
    db.refresh(val)
    return val


def get_realworld_observations(
    db: Session,
    label_status: Optional[str] = None,
    validation_status: Optional[str] = None,
) -> List[RealworldObservationResponse]:
    """
    Assembles real-world observational dataset records joining RecommendationAudit,
    RecommendationFeedback, RecommendationOutcome, and RecommendationLabelValidation.
    Preserves immutable prediction-time feature snapshots and separates post-prediction outcomes.
    """
    audits = db.execute(
        select(RecommendationAudit)
        .options(
            joinedload(RecommendationAudit.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(RecommendationAudit.task),
            joinedload(RecommendationAudit.project),
        )
        .order_by(desc(RecommendationAudit.generated_at))
    ).scalars().all()

    results: List[RealworldObservationResponse] = []

    for audit in audits:
        feedback = db.scalar(
            select(RecommendationFeedback)
            .where(RecommendationFeedback.recommendation_id == audit.recommendation_id)
            .order_by(desc(RecommendationFeedback.created_at))
        )

        outcome = db.scalar(
            select(RecommendationOutcome)
            .where(RecommendationOutcome.recommendation_id == audit.recommendation_id)
            .order_by(desc(RecommendationOutcome.created_at))
        )

        val = get_or_create_label_validation(db, audit, feedback, outcome)

        if label_status and val.label_status.value != label_status:
            continue
        if validation_status and val.validation_status.value != validation_status:
            continue

        dev_user = audit.developer_profile.user if audit.developer_profile and audit.developer_profile.user else None
        dev_name = dev_user.name if dev_user else "Developer"
        task_title = audit.task.title if audit.task else "Task"
        proj_name = audit.project.name if audit.project else "Project"

        val_user = db.scalar(select(User).where(User.id == val.validator_id)) if val.validator_id else None

        results.append(
            RealworldObservationResponse(
                observation_id=val.observation_id,
                recommendation_id=audit.recommendation_id,
                developer_id=audit.developer_id,
                developer_name=dev_name,
                task_id=audit.task_id,
                task_title=task_title,
                project_id=audit.project_id,
                project_name=proj_name,
                recommendation_timestamp=audit.generated_at,
                model_name=audit.model_name,
                model_version=audit.model_version,
                environment=audit.environment,
                rank=audit.rank,
                recommendation_score=float(audit.recommendation_score),
                feature_snapshot=audit.feature_snapshot or {},
                feedback_decision=feedback.decision if feedback else None,
                reviewer_comment=feedback.comment if feedback else None,
                was_assigned=outcome.was_assigned if outcome else False,
                assignment_id=outcome.assignment_id if outcome else None,
                assignment_status=outcome.assignment_outcome_status.value if outcome else None,
                assignment_created_at=outcome.assignment_created_at if outcome else None,
                completion_status="COMPLETED" if (outcome and outcome.completed_at) else ("IN_PROGRESS" if (outcome and outcome.was_assigned) else "UNASSIGNED"),
                completed_at=outcome.completed_at if outcome else None,
                outcome_status=outcome.assignment_outcome_status if outcome else OutcomeStatus.RECOMMENDED,
                proposed_research_label=val.proposed_research_label,
                label_status=val.label_status,
                label_reason=val.label_reason,
                validation_status=val.validation_status,
                validator_name=val_user.name if val_user else None,
                validation_reason=val.validation_reason,
                validated_at=val.validated_at,
            )
        )

    return results


def validate_observation_label(
    db: Session,
    audit_id: uuid.UUID,
    validator_id: uuid.UUID,
    validation_status: ValidationStatus,
    validation_reason: Optional[str] = None,
) -> LabelValidationResponse:
    """
    Validates a research label observation. Converts WEAK_LABEL to VALIDATED_LABEL
    with explicit human sign-off (VALIDATED_POSITIVE / VALIDATED_NEGATIVE / REJECTED_LABEL / AMBIGUOUS).
    Does NOT overwrite underlying observational evidence.
    """
    audit = db.scalar(select(RecommendationAudit).where(RecommendationAudit.id == audit_id))
    if not audit:
        # Check if audit_id passed was recommendation_id
        audit = db.scalar(select(RecommendationAudit).where(RecommendationAudit.recommendation_id == audit_id))
        if not audit:
            raise ValueError(f"Recommendation audit record with ID {audit_id} not found.")

    feedback = db.scalar(select(RecommendationFeedback).where(RecommendationFeedback.recommendation_id == audit.recommendation_id))
    outcome = db.scalar(select(RecommendationOutcome).where(RecommendationOutcome.recommendation_id == audit.recommendation_id))

    val = get_or_create_label_validation(db, audit, feedback, outcome)

    val.validation_status = validation_status
    val.validator_id = validator_id
    val.validation_reason = validation_reason
    val.validated_at = datetime.now(timezone.utc)

    if validation_status == ValidationStatus.VALIDATED_POSITIVE:
        val.label_status = LabelStatus.VALIDATED_LABEL
        val.proposed_research_label = 1
        val.label_reason = f"Human validated positive ground truth: {validation_reason or 'Explicit approval'}"
    elif validation_status == ValidationStatus.VALIDATED_NEGATIVE:
        val.label_status = LabelStatus.VALIDATED_LABEL
        val.proposed_research_label = 0
        val.label_reason = f"Human validated negative ground truth: {validation_reason or 'Explicit rejection'}"
    elif validation_status == ValidationStatus.REJECTED_LABEL:
        val.label_status = LabelStatus.UNLABELED
        val.proposed_research_label = None
        val.label_reason = f"Proposed weak label rejected by reviewer: {validation_reason or 'Insufficient evidence'}"
    elif validation_status == ValidationStatus.AMBIGUOUS:
        val.label_status = LabelStatus.AMBIGUOUS
        val.proposed_research_label = None
        val.label_reason = f"Marked ambiguous by reviewer: {validation_reason or 'Confounding external factors'}"

    db.commit()
    db.refresh(val)

    validator_user = db.scalar(select(User).where(User.id == validator_id))

    return LabelValidationResponse(
        id=val.id,
        recommendation_audit_id=val.recommendation_audit_id,
        observation_id=val.observation_id,
        proposed_research_label=val.proposed_research_label,
        label_status=val.label_status,
        label_reason=val.label_reason,
        validation_status=val.validation_status,
        validator_id=val.validator_id,
        validator_name=validator_user.name if validator_user else None,
        validation_reason=val.validation_reason,
        validated_at=val.validated_at,
        created_at=val.created_at,
        updated_at=val.updated_at,
    )


def analyze_data_quality(db: Session) -> DataQualityReportResponse:
    """
    Performs automated data quality checks across real-world observations:
    - Missing values in feature snapshots
    - Duplicate observation IDs / candidate pairs
    - Invalid feature ranges
    - Timestamp ordering & temporal leakage checks
    - Lifecycle state machine consistency
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    missing_count = 0
    duplicate_count = 0
    invalid_range_count = 0
    leakage_flags = 0
    lifecycle_errors = 0

    seen_pairs = set()

    for obs in observations:
        snapshot = obs.feature_snapshot
        if not snapshot or len(snapshot) == 0:
            missing_count += 1
        else:
            # Check invalid ranges
            if snapshot.get("dev_workload_score", 0) < 0 or snapshot.get("weighted_skill_match_score", 0) < 0:
                invalid_range_count += 1

            # Temporal leakage check: Ensure no post-prediction outcomes in feature snapshot
            for post_key in ["was_assigned", "completed_at", "feedback_decision", "outcome_status"]:
                if post_key in snapshot:
                    leakage_flags += 1

        # Check duplicate candidate pair (developer_id, task_id)
        pair = (obs.developer_id, obs.task_id)
        if pair in seen_pairs:
            duplicate_count += 1
        else:
            seen_pairs.add(pair)

        # Timestamp ordering check: recommendation_timestamp <= assignment_created_at <= completed_at
        rec_time = obs.recommendation_timestamp
        if obs.assignment_created_at and rec_time and obs.assignment_created_at < rec_time:
            leakage_flags += 1
        if obs.completed_at and obs.assignment_created_at and obs.completed_at < obs.assignment_created_at:
            leakage_flags += 1

        # Lifecycle state machine consistency:
        # Cannot be COMPLETED without being assigned
        if obs.completion_status == "COMPLETED" and not obs.was_assigned:
            lifecycle_errors += 1

    total_issues = missing_count + duplicate_count + invalid_range_count + leakage_flags + lifecycle_errors
    quality_score = 100.0 if total == 0 else max(0.0, 100.0 - (total_issues / max(1, total) * 100.0))

    return DataQualityReportResponse(
        total_observations=total,
        missing_value_count=missing_count,
        duplicate_observation_count=duplicate_count,
        invalid_range_count=invalid_range_count,
        temporal_leakage_flag_count=leakage_flags,
        invalid_lifecycle_transition_count=lifecycle_errors,
        quality_score_percentage=round(quality_score, 2),
        disclaimer="Data quality report evaluates feature snapshot completeness, timestamp ordering, and lifecycle consistency across real-world application observations.",
    )


def get_class_distribution(db: Session) -> ClassDistributionResponse:
    """
    Calculates positive/negative validated labels, weak labels, unlabeled, ambiguous,
    and class imbalance ratio strictly on the validated labeled dataset.
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    pos_val = 0
    neg_val = 0
    weak_cnt = 0
    unlabeled_cnt = 0
    ambiguous_cnt = 0

    for obs in observations:
        if obs.validation_status == ValidationStatus.VALIDATED_POSITIVE:
            pos_val += 1
        elif obs.validation_status == ValidationStatus.VALIDATED_NEGATIVE:
            neg_val += 1
        elif obs.label_status == LabelStatus.WEAK_LABEL:
            weak_cnt += 1
        elif obs.label_status == LabelStatus.AMBIGUOUS:
            ambiguous_cnt += 1
        else:
            unlabeled_cnt += 1

    validated_total = pos_val + neg_val
    imbalance_ratio = None
    if validated_total > 0:
        minority = min(pos_val, neg_val)
        majority = max(pos_val, neg_val)
        imbalance_ratio = round(majority / max(1, minority), 2) if minority > 0 else float("inf")

    desc_str = f"{pos_val} positive validated, {neg_val} negative validated out of {validated_total} total validated labels."

    return ClassDistributionResponse(
        total_observations=total,
        validated_positive_count=pos_val,
        validated_negative_count=neg_val,
        weak_label_count=weak_cnt,
        unlabeled_count=unlabeled_cnt,
        ambiguous_count=ambiguous_cnt,
        class_imbalance_ratio=imbalance_ratio,
        imbalance_description=desc_str,
    )


def compare_synthetic_vs_realworld(db: Session) -> DatasetComparisonResponse:
    """
    Computes statistical feature comparisons between synthetic-v1 dataset and real-world audit observations.
    """
    observations = get_realworld_observations(db)
    rw_total = len(observations)

    features_to_compare = [
        "dev_workload_score",
        "dev_experience_years",
        "dev_performance_score",
        "dev_availability_encoded",
        "skill_coverage_ratio",
        "min_proficiency_gap",
        "task_complexity_encoded",
        "estimated_hours",
    ]

    # Synthetic baseline metrics (derived from synthetic-v1 dataset)
    synthetic_stats = {
        "dev_workload_score": (45.2, 18.4),
        "dev_experience_years": (5.1, 2.3),
        "dev_performance_score": (88.5, 6.2),
        "dev_availability_encoded": (0.85, 0.25),
        "skill_coverage_ratio": (0.72, 0.21),
        "min_proficiency_gap": (-8.5, 12.1),
        "task_complexity_encoded": (1.9, 0.7),
        "estimated_hours": (16.4, 8.2),
    }

    feature_stats_list: List[FeatureDistributionStats] = []

    for feat in features_to_compare:
        syn_mean, syn_std = synthetic_stats.get(feat, (0.0, 0.0))

        vals = []
        for obs in observations:
            if obs.feature_snapshot and feat in obs.feature_snapshot:
                val = obs.feature_snapshot[feat]
                if isinstance(val, (int, float)):
                    vals.append(float(val))

        if vals:
            rw_mean = float(sum(vals) / len(vals))
            variance = sum((x - rw_mean) ** 2 for x in vals) / len(vals)
            rw_std = float(variance ** 0.5)
            delta = float(abs(rw_mean - syn_mean))
        else:
            rw_mean, rw_std, delta = None, None, None

        feature_stats_list.append(
            FeatureDistributionStats(
                feature_name=feat,
                synthetic_mean=round(syn_mean, 2),
                synthetic_std=round(syn_std, 2),
                realworld_mean=round(rw_mean, 2) if rw_mean is not None else None,
                realworld_std=round(rw_std, 2) if rw_std is not None else None,
                delta_mean=round(delta, 2) if delta is not None else None,
            )
        )

    summary = (
        f"Compared synthetic-v1 (1,500 samples) against realworld-v1 ({rw_total} real-world observations). "
        "Feature distribution variations reflect real-world operational environments and do not imply model inaccuracy."
    )

    return DatasetComparisonResponse(
        synthetic_dataset_version="synthetic-v1",
        realworld_dataset_version="realworld-v1",
        synthetic_total_samples=1500,
        realworld_total_samples=rw_total,
        comparison_summary=summary,
        feature_comparisons=feature_stats_list,
    )


def evaluate_model_training_readiness(db: Session) -> RealworldTrainingReadinessResponse:
    """
    Evaluates multi-criteria readiness requirements for real-world ML dataset training readiness:
    - Validated labels >= 200
    - Positive validated >= 20, Negative validated >= 20
    - 0 Temporal leakage flags
    - Feature completeness >= 98%
    - Lifecycle consistency 100%
    """
    observations = get_realworld_observations(db)
    quality = analyze_data_quality(db)
    dist = get_class_distribution(db)

    val_count = dist.validated_positive_count + dist.validated_negative_count
    pos_count = dist.validated_positive_count
    neg_count = dist.validated_negative_count

    c1 = MultiCriteriaReadinessCheck(
        criterion="Minimum Validated Labels",
        required_condition=">= 200 validated labels",
        actual_value=f"{val_count} validated labels",
        is_passed=(val_count >= 200),
    )

    c2 = MultiCriteriaReadinessCheck(
        criterion="Class Representation",
        required_condition=">= 20 positive and >= 20 negative validated labels",
        actual_value=f"{pos_count} positive, {neg_count} negative",
        is_passed=(pos_count >= 20 and neg_count >= 20),
    )

    c3 = MultiCriteriaReadinessCheck(
        criterion="Temporal Leakage Protection",
        required_condition="0 temporal leakage flags",
        actual_value=f"{quality.temporal_leakage_flag_count} leakage flags",
        is_passed=(quality.temporal_leakage_flag_count == 0),
    )

    c4 = MultiCriteriaReadinessCheck(
        criterion="Feature Snapshot Completeness",
        required_condition=">= 98.0% quality score",
        actual_value=f"{quality.quality_score_percentage}% quality score",
        is_passed=(quality.quality_score_percentage >= 98.0),
    )

    c5 = MultiCriteriaReadinessCheck(
        criterion="Lifecycle Consistency",
        required_condition="0 invalid state machine transitions",
        actual_value=f"{quality.invalid_lifecycle_transition_count} invalid transitions",
        is_passed=(quality.invalid_lifecycle_transition_count == 0),
    )

    checks = [c1, c2, c3, c4, c5]
    all_passed = all(c.is_passed for c in checks)

    if not c1.is_passed or not c3.is_passed or not c5.is_passed:
        status = ReadinessStatus.NOT_READY
        summary = f"NOT_READY: Real-world dataset does not meet minimum validated sample size or data quality standards ({val_count}/200 validated labels)."
    elif not c2.is_passed or not c4.is_passed:
        status = ReadinessStatus.REVIEW_REQUIRED
        summary = "REVIEW_REQUIRED: Sufficient observations exist but requires explicit research review due to class imbalance or feature missingness."
    else:
        status = ReadinessStatus.READY_FOR_EXPERIMENT
        summary = "READY_FOR_EXPERIMENT: Real-world observational dataset meets all sample size, class distribution, and data quality requirements."

    return RealworldTrainingReadinessResponse(
        readiness_status=status,
        total_observations=len(observations),
        validated_labels_count=val_count,
        validated_positive_count=pos_count,
        validated_negative_count=neg_count,
        temporal_leakage_passed=c3.is_passed,
        feature_completeness_passed=c4.is_passed,
        lifecycle_consistency_passed=c5.is_passed,
        readiness_summary=summary,
        readiness_checks=checks,
    )


def export_realworld_dataset(db: Session) -> DatasetExportMetadataResponse:
    """
    Exports versioned real-world dataset files into research/dataset/realworld/:
    - observations.csv
    - labeled.csv
    - validated.csv
    - dataset_metadata.json
    """
    observations = get_realworld_observations(db)

    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "dataset", "realworld"))
    os.makedirs(out_dir, exist_ok=True)

    obs_csv_path = os.path.join(out_dir, "observations.csv")
    labeled_csv_path = os.path.join(out_dir, "labeled.csv")
    validated_csv_path = os.path.join(out_dir, "validated.csv")
    meta_json_path = os.path.join(out_dir, "dataset_metadata.json")

    fieldnames = [
        "observation_id", "recommendation_id", "developer_id", "developer_name",
        "task_id", "task_title", "project_id", "project_name", "recommendation_timestamp",
        "model_name", "model_version", "environment", "rank", "recommendation_score",
        "feedback_decision", "was_assigned", "assignment_status", "completion_status",
        "proposed_research_label", "label_status", "label_reason", "validation_status",
        "validator_name", "validation_reason", "validated_at"
    ]

    # Write observations.csv
    with open(obs_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for obs in observations:
            row = obs.model_dump(mode="json")
            writer.writerow({k: row.get(k) for k in fieldnames})

    # Write labeled.csv (includes WEAK_LABEL and VALIDATED_LABEL)
    labeled_obs = [obs for obs in observations if obs.label_status in (LabelStatus.WEAK_LABEL, LabelStatus.VALIDATED_LABEL)]
    with open(labeled_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for obs in labeled_obs:
            row = obs.model_dump(mode="json")
            writer.writerow({k: row.get(k) for k in fieldnames})

    # Write validated.csv (strictly human VALIDATED_LABEL)
    validated_obs = [obs for obs in observations if obs.validation_status in (ValidationStatus.VALIDATED_POSITIVE, ValidationStatus.VALIDATED_NEGATIVE)]
    with open(validated_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for obs in validated_obs:
            row = obs.model_dump(mode="json")
            writer.writerow({k: row.get(k) for k in fieldnames})

    # Write dataset_metadata.json
    now = datetime.now(timezone.utc)
    dist = get_class_distribution(db)
    readiness = evaluate_model_training_readiness(db)

    metadata = {
        "dataset_version": "realworld-v1",
        "source": "production_observations",
        "exported_at": now.isoformat(),
        "total_observations": len(observations),
        "labeled_observations": len(labeled_obs),
        "validated_observations": len(validated_obs),
        "ambiguous_observations": dist.ambiguous_count,
        "readiness_status": readiness.readiness_status.value,
        "exported_files": ["observations.csv", "labeled.csv", "validated.csv", "dataset_metadata.json"],
    }

    with open(meta_json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return DatasetExportMetadataResponse(
        dataset_version="realworld-v1",
        source="production_observations",
        exported_at=now,
        total_observations=len(observations),
        labeled_observations=len(labeled_obs),
        validated_observations=len(validated_obs),
        ambiguous_observations=dist.ambiguous_count,
        exported_files=["observations.csv", "labeled.csv", "validated.csv", "dataset_metadata.json"],
    )
