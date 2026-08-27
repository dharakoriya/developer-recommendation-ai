import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, desc

from app.models.recommendation_audit import RecommendationAudit, RecommendationFeedback, RecommendationOutcome
from app.models.recommendation_validation import RecommendationLabelValidation
from app.models.recommendation_snapshot import RecommendationDatasetSnapshot
from app.models.user import User
from app.models.developer import DeveloperProfile
from app.models.task import Task
from app.models.project import Project
from app.models.enums import FeedbackDecision, OutcomeStatus, LabelStatus, ValidationStatus, ReadinessStatus
from app.schemas.realworld_monitoring import (
    DataCollectionMonitoringResponse,
    ModelVersionObservationCount,
    EnvironmentObservationCount,
    DatasetGrowthResponse,
    DatasetGrowthPoint,
    LabelQualityMonitoringResponse,
    OutcomeFunnelResponse,
    OutcomeFunnelStage,
    DatasetDiversityResponse,
    ConcentrationWarning,
    DatasetSnapshotResponse,
)
from app.services.realworld_dataset_service import get_realworld_observations, analyze_data_quality, get_class_distribution


def get_data_collection_monitoring(db: Session) -> DataCollectionMonitoringResponse:
    """
    Computes comprehensive data collection monitoring statistics across models, environments,
    feedback decisions, assignment outcomes, weak labels, and human validated labels.
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    this_week = 0
    this_month = 0
    by_model: Dict[str, int] = {}
    by_env: Dict[str, int] = {}

    fb_count = 0
    acc_count = 0
    rej_count = 0
    ign_count = 0
    def_count = 0

    assigned_count = 0
    completed_count = 0
    reassigned_count = 0
    cancelled_count = 0

    weak_pos = 0
    weak_neg = 0
    ambiguous = 0
    unlabeled = 0
    val_pos = 0
    val_neg = 0

    for obs in observations:
        ts = obs.recommendation_timestamp
        if ts:
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if ts >= week_ago:
                this_week += 1
            if ts >= month_ago:
                this_month += 1

        by_model[obs.model_version] = by_model.get(obs.model_version, 0) + 1
        by_env[obs.environment] = by_env.get(obs.environment, 0) + 1

        if obs.feedback_decision:
            fb_count += 1
            if obs.feedback_decision == FeedbackDecision.ACCEPTED:
                acc_count += 1
            elif obs.feedback_decision == FeedbackDecision.REJECTED:
                rej_count += 1
            elif obs.feedback_decision == FeedbackDecision.IGNORED:
                ign_count += 1
            elif obs.feedback_decision == FeedbackDecision.DEFERRED:
                def_count += 1

        if obs.was_assigned:
            assigned_count += 1
        if obs.completion_status == "COMPLETED":
            completed_count += 1
        elif obs.assignment_status == "REASSIGNED":
            reassigned_count += 1
        elif obs.assignment_status == "CANCELLED":
            cancelled_count += 1

        if obs.validation_status == ValidationStatus.VALIDATED_POSITIVE:
            val_pos += 1
        elif obs.validation_status == ValidationStatus.VALIDATED_NEGATIVE:
            val_neg += 1
        elif obs.label_status == LabelStatus.WEAK_LABEL:
            if obs.proposed_research_label == 1:
                weak_pos += 1
            else:
                weak_neg += 1
        elif obs.label_status == LabelStatus.AMBIGUOUS:
            ambiguous += 1
        else:
            unlabeled += 1

    model_counts = [ModelVersionObservationCount(model_version=k, count=v) for k, v in by_model.items()]
    env_counts = [EnvironmentObservationCount(environment=k, count=v) for k, v in by_env.items()]

    return DataCollectionMonitoringResponse(
        total_observations=total,
        observations_this_week=this_week,
        observations_this_month=this_month,
        by_model_version=model_counts,
        by_environment=env_counts,
        total_feedback_submitted=fb_count,
        accepted_feedback_count=acc_count,
        rejected_feedback_count=rej_count,
        ignored_feedback_count=ign_count,
        deferred_feedback_count=def_count,
        assigned_count=assigned_count,
        completed_count=completed_count,
        reassigned_count=reassigned_count,
        cancelled_count=cancelled_count,
        weak_positive_labels=weak_pos,
        weak_negative_labels=weak_neg,
        ambiguous_observations=ambiguous,
        unlabeled_observations=unlabeled,
        validated_positive_labels=val_pos,
        validated_negative_labels=val_neg,
    )


def get_dataset_growth(db: Session) -> DatasetGrowthResponse:
    """
    Calculates time-series accumulation points for dataset growth over time.
    """
    observations = get_realworld_observations(db)
    # Sort chronologically
    sorted_obs = sorted(observations, key=lambda x: x.recommendation_timestamp or datetime.min.replace(tzinfo=timezone.utc))

    points: List[DatasetGrowthPoint] = []
    tot = 0
    labeled = 0
    validated = 0
    pos = 0
    neg = 0

    for obs in sorted_obs:
        tot += 1
        if obs.label_status in (LabelStatus.WEAK_LABEL, LabelStatus.VALIDATED_LABEL):
            labeled += 1
        if obs.validation_status in (ValidationStatus.VALIDATED_POSITIVE, ValidationStatus.VALIDATED_NEGATIVE):
            validated += 1
            if obs.validation_status == ValidationStatus.VALIDATED_POSITIVE:
                pos += 1
            else:
                neg += 1

        period_str = obs.recommendation_timestamp.strftime("%Y-%m-%d") if obs.recommendation_timestamp else "N/A"
        points.append(
            DatasetGrowthPoint(
                period=period_str,
                timestamp=obs.recommendation_timestamp or datetime.now(timezone.utc),
                total_observations=tot,
                labeled_observations=labeled,
                validated_observations=validated,
                positive_labels=pos,
                negative_labels=neg,
            )
        )

    summary = f"Accumulated {tot} observations, {labeled} labeled, and {validated} validated research ground-truth candidates."
    return DatasetGrowthResponse(
        dataset_version="realworld-v1",
        time_series=points,
        growth_summary=summary,
    )


def get_label_quality_monitoring(db: Session) -> LabelQualityMonitoringResponse:
    """
    Monitors research label coverage rates, validation turnaround time, and detects suspicious anomalies.
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    if total == 0:
        return LabelQualityMonitoringResponse(
            label_coverage_percentage=0.0,
            validated_label_percentage=0.0,
            weak_label_rate=0.0,
            ambiguous_rate=0.0,
            rejected_label_rate=0.0,
            validation_turnaround_hours=None,
            positive_negative_ratio=None,
            anomaly_warnings=["No observations present in dataset."],
        )

    labeled_cnt = sum(1 for o in observations if o.label_status in (LabelStatus.WEAK_LABEL, LabelStatus.VALIDATED_LABEL))
    validated_cnt = sum(1 for o in observations if o.validation_status in (ValidationStatus.VALIDATED_POSITIVE, ValidationStatus.VALIDATED_NEGATIVE))
    weak_cnt = sum(1 for o in observations if o.label_status == LabelStatus.WEAK_LABEL)
    ambiguous_cnt = sum(1 for o in observations if o.label_status == LabelStatus.AMBIGUOUS)
    rejected_val_cnt = sum(1 for o in observations if o.validation_status == ValidationStatus.REJECTED_LABEL)

    pos_val = sum(1 for o in observations if o.validation_status == ValidationStatus.VALIDATED_POSITIVE)
    neg_val = sum(1 for o in observations if o.validation_status == ValidationStatus.VALIDATED_NEGATIVE)

    cov_pct = round((labeled_cnt / total) * 100.0, 2)
    val_pct = round((validated_cnt / total) * 100.0, 2)
    weak_rate = round((weak_cnt / total) * 100.0, 2)
    amb_rate = round((ambiguous_cnt / total) * 100.0, 2)
    rej_rate = round((rejected_val_cnt / total) * 100.0, 2)

    ratio = round(pos_val / max(1, neg_val), 2) if neg_val > 0 else None

    # Calculate average validation turnaround time in hours
    turnaround_times = []
    for o in observations:
        if o.validated_at and o.recommendation_timestamp:
            rec_t = o.recommendation_timestamp.replace(tzinfo=timezone.utc) if o.recommendation_timestamp.tzinfo is None else o.recommendation_timestamp
            val_t = o.validated_at.replace(tzinfo=timezone.utc) if o.validated_at.tzinfo is None else o.validated_at
            hours = (val_t - rec_t).total_seconds() / 3600.0
            if hours >= 0:
                turnaround_times.append(hours)

    avg_turnaround = round(sum(turnaround_times) / len(turnaround_times), 2) if turnaround_times else None

    # Anomaly Detection Warnings
    warnings: List[str] = []
    if validated_cnt > 5 and ratio and ratio > 5.0:
        warnings.append(f"HIGH POSITIVE SKEW: Positive/Negative validation ratio is {ratio} (greater than 5.0 threshold).")
    if amb_rate > 40.0:
        warnings.append(f"HIGH AMBIGUOUS RATE: {amb_rate}% of observations marked ambiguous due to incomplete external lifecycle events.")
    if rej_rate > 20.0:
        warnings.append(f"HIGH REJECTED LABEL RATE: {rej_rate}% of weak labels were rejected by human reviewers.")

    return LabelQualityMonitoringResponse(
        label_coverage_percentage=cov_pct,
        validated_label_percentage=val_pct,
        weak_label_rate=weak_rate,
        ambiguous_rate=amb_rate,
        rejected_label_rate=rej_rate,
        validation_turnaround_hours=avg_turnaround,
        positive_negative_ratio=ratio,
        anomaly_warnings=warnings,
    )


def get_outcome_quality_funnel(db: Session) -> OutcomeFunnelResponse:
    """
    Computes recommendation lifecycle conversion funnel:
    RECOMMENDED -> ACCEPTED -> ASSIGNED -> COMPLETED
    alongside alternate paths (REJECTED, IGNORED, DEFERRED, REASSIGNED, CANCELLED).
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    accepted = sum(1 for o in observations if o.feedback_decision == FeedbackDecision.ACCEPTED)
    assigned = sum(1 for o in observations if o.was_assigned)
    completed = sum(1 for o in observations if o.completion_status == "COMPLETED")

    s1 = OutcomeFunnelStage(stage_name="RECOMMENDED", count=total, conversion_percentage=100.0)
    s2 = OutcomeFunnelStage(stage_name="ACCEPTED", count=accepted, conversion_percentage=round((accepted / max(1, total)) * 100.0, 2))
    s3 = OutcomeFunnelStage(stage_name="ASSIGNED", count=assigned, conversion_percentage=round((assigned / max(1, total)) * 100.0, 2))
    s4 = OutcomeFunnelStage(stage_name="COMPLETED", count=completed, conversion_percentage=round((completed / max(1, total)) * 100.0, 2))

    alt_paths = {
        "REJECTED": sum(1 for o in observations if o.feedback_decision == FeedbackDecision.REJECTED),
        "IGNORED": sum(1 for o in observations if o.feedback_decision == FeedbackDecision.IGNORED),
        "DEFERRED": sum(1 for o in observations if o.feedback_decision == FeedbackDecision.DEFERRED),
        "REASSIGNED": sum(1 for o in observations if o.assignment_status == "REASSIGNED"),
        "CANCELLED": sum(1 for o in observations if o.assignment_status == "CANCELLED"),
    }

    summary = f"Outcome funnel: {total} RECOMMENDED ➔ {accepted} ACCEPTED ➔ {assigned} ASSIGNED ➔ {completed} COMPLETED."
    return OutcomeFunnelResponse(
        funnel_stages=[s1, s2, s3, s4],
        alternate_paths=alt_paths,
        funnel_summary=summary,
    )


def get_dataset_diversity(db: Session) -> DatasetDiversityResponse:
    """
    Analyzes feature distribution diversity across unique developers, tasks, projects,
    complexity, priority, and workload, generating concentration warnings.
    """
    observations = get_realworld_observations(db)
    total = len(observations)

    dev_set = set()
    task_set = set()
    proj_set = set()
    dev_counts: Dict[str, int] = {}

    complexity_dist: Dict[str, int] = {}
    priority_dist: Dict[str, int] = {}
    availability_dist: Dict[str, int] = {}
    workload_dist: Dict[str, int] = {}

    for o in observations:
        dev_set.add(o.developer_id)
        task_set.add(o.task_id)
        proj_set.add(o.project_id)
        dev_counts[str(o.developer_id)] = dev_counts.get(str(o.developer_id), 0) + 1

        snap = o.feature_snapshot or {}
        comp = str(snap.get("task_complexity", "MEDIUM"))
        prio = str(snap.get("task_priority", "MEDIUM"))
        avail = str(snap.get("dev_availability_encoded", "1.0"))
        wl = str(int(snap.get("dev_workload_score", 0) // 25 * 25)) + "-" + str(int((snap.get("dev_workload_score", 0) // 25 + 1) * 25))

        complexity_dist[comp] = complexity_dist.get(comp, 0) + 1
        priority_dist[prio] = priority_dist.get(prio, 0) + 1
        availability_dist[avail] = availability_dist.get(avail, 0) + 1
        workload_dist[wl] = workload_dist.get(wl, 0) + 1

    warnings: List[ConcentrationWarning] = []
    if total > 5 and len(dev_set) < 3:
        warnings.append(ConcentrationWarning(dimension="DEVELOPER_CONCENTRATION", warning_message=f"Dataset is dominated by only {len(dev_set)} unique developer(s)."))
    if total > 5 and len(proj_set) < 2:
        warnings.append(ConcentrationWarning(dimension="PROJECT_CONCENTRATION", warning_message=f"Dataset is restricted to only {len(proj_set)} unique project(s)."))

    # Check top developer concentration
    if dev_counts and total > 5:
        max_dev_cnt = max(dev_counts.values())
        if max_dev_cnt / total > 0.5:
            warnings.append(ConcentrationWarning(dimension="DEVELOPER_SKEW", warning_message=f"Single developer accounts for {round((max_dev_cnt/total)*100, 1)}% of all observations."))

    return DatasetDiversityResponse(
        unique_developers_count=len(dev_set),
        unique_tasks_count=len(task_set),
        unique_projects_count=len(proj_set),
        complexity_distribution=complexity_dist,
        priority_distribution=priority_dist,
        availability_distribution=availability_dist,
        workload_distribution=workload_dist,
        concentration_warnings=warnings,
    )


def create_dataset_snapshot(
    db: Session,
    version: str,
    user_id: Optional[uuid.UUID] = None,
    source_range: str = "all_available",
) -> DatasetSnapshotResponse:
    """
    Creates an immutable versioned dataset snapshot record in PostgreSQL and writes snapshot metadata to research/dataset/snapshots/{version}.json.
    Enforces snapshot immutability — raises ValueError if version already exists.
    """
    existing = db.scalar(select(RecommendationDatasetSnapshot).where(RecommendationDatasetSnapshot.dataset_version == version))
    if existing:
        raise ValueError(f"Snapshot version '{version}' already exists and is immutable. Use a new version tag (e.g. realworld-v1.1).")

    obs = get_realworld_observations(db)
    quality = analyze_data_quality(db)
    dist = get_class_distribution(db)

    labeled_cnt = sum(1 for o in obs if o.label_status in (LabelStatus.WEAK_LABEL, LabelStatus.VALIDATED_LABEL))
    val_cnt = dist.validated_positive_count + dist.validated_negative_count

    quality_status = "PASS" if quality.quality_score_percentage >= 98.0 else ("WARNING" if quality.quality_score_percentage >= 85.0 else "FAIL")

    snap_meta = {
        "quality_score_percentage": quality.quality_score_percentage,
        "temporal_leakage_flag_count": quality.temporal_leakage_flag_count,
        "lifecycle_consistency_passed": (quality.invalid_lifecycle_transition_count == 0),
        "source_range": source_range,
    }

    snap = RecommendationDatasetSnapshot(
        dataset_version=version,
        created_by_id=user_id,
        creation_timestamp=datetime.now(timezone.utc),
        source_observation_range=source_range,
        total_observations=len(obs),
        labeled_observations=labeled_cnt,
        validated_labels=val_cnt,
        positive_labels=dist.validated_positive_count,
        negative_labels=dist.validated_negative_count,
        ambiguous_observations=dist.ambiguous_count,
        feature_version="v1.0",
        label_methodology_version="suitability-v1",
        data_quality_status=quality_status,
        snapshot_metadata=snap_meta,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)

    # Write snapshot JSON artifact to research/dataset/snapshots/
    snap_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "dataset", "snapshots"))
    os.makedirs(snap_dir, exist_ok=True)
    snap_json_path = os.path.join(snap_dir, f"{version}.json")

    user_obj = db.scalar(select(User).where(User.id == user_id)) if user_id else None

    json_payload = {
        "id": str(snap.id),
        "dataset_version": snap.dataset_version,
        "created_by_name": user_obj.name if user_obj else "System Administrator",
        "creation_timestamp": snap.creation_timestamp.isoformat(),
        "source_observation_range": snap.source_observation_range,
        "total_observations": snap.total_observations,
        "labeled_observations": snap.labeled_observations,
        "validated_labels": snap.validated_labels,
        "positive_labels": snap.positive_labels,
        "negative_labels": snap.negative_labels,
        "ambiguous_observations": snap.ambiguous_observations,
        "feature_version": snap.feature_version,
        "label_methodology_version": snap.label_methodology_version,
        "data_quality_status": snap.data_quality_status,
        "snapshot_metadata": snap.snapshot_metadata,
    }

    with open(snap_json_path, "w", encoding="utf-8") as f:
        json.dump(json_payload, f, indent=2)

    return DatasetSnapshotResponse(
        id=snap.id,
        dataset_version=snap.dataset_version,
        created_by_id=snap.created_by_id,
        created_by_name=user_obj.name if user_obj else None,
        creation_timestamp=snap.creation_timestamp,
        source_observation_range=snap.source_observation_range,
        total_observations=snap.total_observations,
        labeled_observations=snap.labeled_observations,
        validated_labels=snap.validated_labels,
        positive_labels=snap.positive_labels,
        negative_labels=snap.negative_labels,
        ambiguous_observations=snap.ambiguous_observations,
        feature_version=snap.feature_version,
        label_methodology_version=snap.label_methodology_version,
        data_quality_status=snap.data_quality_status,
        snapshot_metadata=snap.snapshot_metadata,
    )


def list_dataset_snapshots(db: Session) -> List[DatasetSnapshotResponse]:
    """
    Lists all versioned dataset snapshot records.
    """
    snaps = db.execute(
        select(RecommendationDatasetSnapshot)
        .options(joinedload(RecommendationDatasetSnapshot.created_by))
        .order_by(desc(RecommendationDatasetSnapshot.creation_timestamp))
    ).scalars().all()

    results: List[DatasetSnapshotResponse] = []
    for s in snaps:
        results.append(
            DatasetSnapshotResponse(
                id=s.id,
                dataset_version=s.dataset_version,
                created_by_id=s.created_by_id,
                created_by_name=s.created_by.name if s.created_by else None,
                creation_timestamp=s.creation_timestamp,
                source_observation_range=s.source_observation_range,
                total_observations=s.total_observations,
                labeled_observations=s.labeled_observations,
                validated_labels=s.validated_labels,
                positive_labels=s.positive_labels,
                negative_labels=s.negative_labels,
                ambiguous_observations=s.ambiguous_observations,
                feature_version=s.feature_version,
                label_methodology_version=s.label_methodology_version,
                data_quality_status=s.data_quality_status,
                snapshot_metadata=s.snapshot_metadata or {},
            )
        )
    return results
