import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.database import get_db
from app.models.task import Task
from app.models.recommendation import Recommendation, RecommendationExplanation
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole, AvailabilityStatus
from app.schemas.recommendation import (
    ModelMetadataResponse,
    RecommendationExplanationResponse,
    RecommendationResponse,
    RecommendationListResponse,
)
from app.schemas.recommendation_audit import (
    FeedbackCreateRequest,
    RecommendationFeedbackResponse,
    RecommendationAuditResponse,
    RecommendationOutcomeResponse,
    ModelRegistryResponse,
    DatasetPreviewMetricsResponse,
)
from app.schemas.realworld_dataset import (
    RealworldObservationResponse,
    LabelValidationRequest,
    LabelValidationResponse,
    DataQualityReportResponse,
    ClassDistributionResponse,
    DatasetComparisonResponse,
    RealworldTrainingReadinessResponse,
    DatasetExportMetadataResponse,
)
from app.schemas.realworld_monitoring import (
    DataCollectionMonitoringResponse,
    DatasetGrowthResponse,
    LabelQualityMonitoringResponse,
    OutcomeFunnelResponse,
    DatasetDiversityResponse,
    DatasetSnapshotCreateRequest,
    DatasetSnapshotResponse,
)
from app.services.recommendation_service import (
    get_active_recommendation_model,
    generate_and_persist_task_recommendations,
    get_persisted_task_recommendations,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/metadata/model", response_model=ModelMetadataResponse, summary="Get active recommendation model metadata")
def get_model_metadata(
    current_user: User = Depends(get_current_user),
):
    """
    Returns active recommendation engine metadata (e.g. deterministic baseline v1.0).
    Accessible to all authenticated users.
    """
    model = get_active_recommendation_model()
    return model.get_model_metadata()


@router.get("/research/ml/metrics", summary="Get research ML model evaluation metrics")
def get_research_ml_metrics(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves cross-validation, validation selection, test evaluation, and feature importances for research ML models.
    """
    import os
    import json
    metrics_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "ml", "artifacts", "evaluation_metrics.json")
    )
    if not os.path.exists(metrics_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ML evaluation metrics report not found. Execute python research/ml/pipeline_ml.py first.",
        )
    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@router.get("/research/ml/explainability/global", summary="Get global SHAP feature importances")
def get_global_shap_metrics(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves global SHAP feature importance analysis for the research XGBoost model.
    """
    from app.services.ml_explainability_service import get_global_shap_explanations
    return get_global_shap_explanations()


@router.get("/research/ml/explainability/local/{developer_id}/{task_id}", summary="Get candidate local SHAP feature attributions")
def get_local_shap_metrics(
    developer_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves candidate-level local SHAP feature attributions explaining suitability prediction for a (Developer, Task) pair.
    """
    from app.services.ml_explainability_service import get_local_shap_explanation_for_candidate
    try:
        return get_local_shap_explanation_for_candidate(db, developer_id, task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{id}/feedback", response_model=RecommendationFeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit human reviewer feedback for a recommendation")
def submit_feedback(
    id: uuid.UUID,
    fb_in: FeedbackCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits human reviewer feedback (ACCEPTED, REJECTED, IGNORED, DEFERRED) for a recommendation.
    """
    from app.services.outcome_dataset_service import submit_recommendation_feedback
    try:
        fb_orm = submit_recommendation_feedback(db, id, current_user.id, fb_in.decision, fb_in.comment)
        return RecommendationFeedbackResponse(
            id=fb_orm.id,
            recommendation_id=fb_orm.recommendation_id,
            reviewer_id=fb_orm.reviewer_id,
            reviewer_name=current_user.name if current_user else None,
            decision=fb_orm.decision,
            comment=fb_orm.comment,
            created_at=fb_orm.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{id}/audit", response_model=RecommendationAuditResponse, summary="Get audit record for a single recommendation")
def get_single_recommendation_audit(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the immutable audit log record and feature snapshot for a single recommendation.
    """
    from app.models.recommendation_audit import RecommendationAudit
    audit = db.scalar(select(RecommendationAudit).where(RecommendationAudit.recommendation_id == id))
    if not audit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit record for recommendation {id} not found.")

    return RecommendationAuditResponse(
        id=audit.id,
        recommendation_id=audit.recommendation_id,
        developer_id=audit.developer_id,
        developer_name=audit.developer_profile.user.name if audit.developer_profile and audit.developer_profile.user else "Developer",
        task_id=audit.task_id,
        task_title=audit.task.title if audit.task else "Task",
        project_id=audit.project_id,
        project_name=audit.project.name if audit.project else "Project",
        rank=audit.rank,
        recommendation_score=float(audit.recommendation_score),
        model_name=audit.model_name,
        model_version=audit.model_version,
        environment=audit.environment,
        feature_snapshot=audit.feature_snapshot,
        generated_at=audit.generated_at,
    )


@router.get("/audit", response_model=List[RecommendationAuditResponse], summary="List recommendation audit records")
@router.get("/audit/logs", response_model=List[RecommendationAuditResponse], summary="List recommendation audit records (alias)")
def list_recommendation_audits(
    environment: Optional[str] = None,
    model_version: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists recommendation audit log records with optional environment or model_version filtering.
    """
    from app.models.recommendation_audit import RecommendationAudit
    stmt = select(RecommendationAudit).options(
        joinedload(RecommendationAudit.developer_profile).joinedload(DeveloperProfile.user),
        joinedload(RecommendationAudit.task),
        joinedload(RecommendationAudit.project),
    ).order_by(desc(RecommendationAudit.generated_at))

    if environment:
        stmt = stmt.where(RecommendationAudit.environment == environment)
    if model_version:
        stmt = stmt.where(RecommendationAudit.model_version == model_version)

    audits = db.execute(stmt).scalars().all()
    results = []
    for a in audits:
        results.append(
            RecommendationAuditResponse(
                id=a.id,
                recommendation_id=a.recommendation_id,
                developer_id=a.developer_id,
                developer_name=a.developer_profile.user.name if a.developer_profile and a.developer_profile.user else "Developer",
                task_id=a.task_id,
                task_title=a.task.title if a.task else "Task",
                project_id=a.project_id,
                project_name=a.project.name if a.project else "Project",
                rank=a.rank,
                recommendation_score=float(a.recommendation_score),
                model_name=a.model_name,
                model_version=a.model_version,
                environment=a.environment,
                feature_snapshot=a.feature_snapshot,
                generated_at=a.generated_at,
            )
        )
    return results


@router.get("/feedback", response_model=List[RecommendationFeedbackResponse], summary="List recommendation feedbacks")
def list_recommendation_feedbacks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all submitted human reviewer feedback records.
    """
    from app.models.recommendation_audit import RecommendationFeedback
    stmt = select(RecommendationFeedback).options(joinedload(RecommendationFeedback.reviewer)).order_by(desc(RecommendationFeedback.created_at))
    fbs = db.execute(stmt).scalars().all()
    return [
        RecommendationFeedbackResponse(
            id=fb.id,
            recommendation_id=fb.recommendation_id,
            reviewer_id=fb.reviewer_id,
            reviewer_name=fb.reviewer.name if fb.reviewer else "Reviewer",
            decision=fb.decision,
            comment=fb.comment,
            created_at=fb.created_at,
        )
        for fb in fbs
    ]


@router.get("/research/outcomes", response_model=List[RecommendationOutcomeResponse], summary="List recommendation outcome lifecycle records")
def list_recommendation_outcomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists recommendation lifecycle event outcomes (RECOMMENDED -> ACCEPTED -> ASSIGNED -> COMPLETED).
    """
    from app.models.recommendation_audit import RecommendationOutcome
    stmt = select(RecommendationOutcome).options(
        joinedload(RecommendationOutcome.developer_profile).joinedload(DeveloperProfile.user),
        joinedload(RecommendationOutcome.task),
    ).order_by(desc(RecommendationOutcome.created_at))

    outcomes = db.execute(stmt).scalars().all()
    return [
        RecommendationOutcomeResponse(
            id=o.id,
            recommendation_id=o.recommendation_id,
            developer_id=o.developer_id,
            developer_name=o.developer_profile.user.name if o.developer_profile and o.developer_profile.user else "Developer",
            task_id=o.task_id,
            task_title=o.task.title if o.task else "Task",
            was_assigned=o.was_assigned,
            assignment_id=o.assignment_id,
            assignment_created_at=o.assignment_created_at,
            assignment_outcome_status=o.assignment_outcome_status,
            completed_at=o.completed_at,
            created_at=o.created_at,
        )
        for o in outcomes
    ]


@router.get("/research/dataset-preview", response_model=DatasetPreviewMetricsResponse, summary="Get observational dataset preview and ML training readiness metrics")
def get_dataset_preview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves observational dataset preview metrics and real-world ML dataset training readiness assessment.
    """
    from app.services.outcome_dataset_service import get_observational_dataset_preview
    return get_observational_dataset_preview(db)


@router.get("/research/model-registry", response_model=List[ModelRegistryResponse], summary="Get model governance registry records")
def get_model_registry(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves model registry governance records for production and research environments.
    """
    from app.services.model_governance_service import get_model_registry_governance
    return get_model_registry_governance()


# Milestone 14 — Real-World Research Dataset & Label Validation Endpoints
@router.get("/research/dataset/observations", response_model=List[RealworldObservationResponse], summary="Get all real-world recommendation observations")
def get_dataset_observations(
    label_status: Optional[str] = None,
    validation_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves real-world recommendation observations with immutable prediction-time feature snapshots
    and separated post-prediction outcome data. Supports optional label_status or validation_status filtering.
    """
    from app.services.realworld_dataset_service import get_realworld_observations
    return get_realworld_observations(db, label_status=label_status, validation_status=validation_status)


@router.get("/research/dataset/statistics", response_model=ClassDistributionResponse, summary="Get real-world dataset class distribution statistics")
def get_dataset_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves positive/negative validated label counts, weak labels, unlabeled, ambiguous, and class imbalance ratio.
    """
    from app.services.realworld_dataset_service import get_class_distribution
    return get_class_distribution(db)


@router.get("/research/dataset/quality", response_model=DataQualityReportResponse, summary="Get real-world dataset quality report")
def get_dataset_quality(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves data quality audit metrics including missing feature values, duplicate candidate pairs,
    invalid feature ranges, temporal leakage flags, and lifecycle state machine consistency.
    """
    from app.services.realworld_dataset_service import analyze_data_quality
    return analyze_data_quality(db)


@router.get("/research/dataset/labels", response_model=List[RealworldObservationResponse], summary="Get observations awaiting label validation")
def get_dataset_labels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves observations categorized by weak or validated research labels.
    """
    from app.services.realworld_dataset_service import get_realworld_observations
    return get_realworld_observations(db)


@router.post("/research/dataset/labels/{id}/validate", response_model=LabelValidationResponse, summary="Validate or reject a research label observation")
def validate_dataset_label(
    id: uuid.UUID,
    req: LabelValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Validates a research label observation. Converts WEAK_LABEL to VALIDATED_LABEL with explicit human sign-off
    (VALIDATED_POSITIVE, VALIDATED_NEGATIVE, REJECTED_LABEL, AMBIGUOUS).
    Requires ADMIN or MANAGER role.
    """
    from app.services.realworld_dataset_service import validate_observation_label
    try:
        return validate_observation_label(db, id, current_user.id, req.validation_status, req.validation_reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/research/dataset/readiness", response_model=RealworldTrainingReadinessResponse, summary="Get real-world ML model training readiness assessment")
def get_dataset_readiness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluates multi-criteria training readiness requirements (validated label count >= 200, minority class >= 20, 0 leakage, feature completeness).
    Returns NOT_READY, REVIEW_REQUIRED, or READY_FOR_EXPERIMENT.
    """
    from app.services.realworld_dataset_service import evaluate_model_training_readiness
    return evaluate_model_training_readiness(db)


@router.get("/research/dataset/export", response_model=DatasetExportMetadataResponse, summary="Export versioned realworld-v1 research dataset files")
def export_dataset_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Generates and exports realworld-v1 dataset files to research/dataset/realworld/
    (observations.csv, labeled.csv, validated.csv, dataset_metadata.json).
    Requires ADMIN or MANAGER role.
    """
    from app.services.realworld_dataset_service import export_realworld_dataset
    return export_realworld_dataset(db)


@router.get("/research/dataset/comparison", response_model=DatasetComparisonResponse, summary="Compare synthetic-v1 vs realworld-v1 dataset feature distributions")
def get_dataset_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes statistical feature distribution comparisons between synthetic-v1 dataset and real-world audit observations.
    """
    from app.services.realworld_dataset_service import compare_synthetic_vs_realworld
    return compare_synthetic_vs_realworld(db)


# Milestone 15 — Real-World Dataset Collection, Label Accumulation & Research Monitoring Endpoints
@router.get("/research/dataset/monitoring", response_model=DataCollectionMonitoringResponse, summary="Get comprehensive real-world dataset collection monitoring metrics")
def get_dataset_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves real-world observation collection statistics by model, environment, time, feedback decision, outcomes, and label counts.
    """
    from app.services.realworld_monitoring_service import get_data_collection_monitoring
    return get_data_collection_monitoring(db)


@router.get("/research/dataset/growth", response_model=DatasetGrowthResponse, summary="Get dataset accumulation growth time-series data")
def get_dataset_growth_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves time-series data points tracking dataset accumulation over time.
    """
    from app.services.realworld_monitoring_service import get_dataset_growth
    return get_dataset_growth(db)


@router.get("/research/dataset/label-quality", response_model=LabelQualityMonitoringResponse, summary="Get label quality and anomaly detection monitoring metrics")
def get_label_quality_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves label coverage rates, validation turnaround time, positive/negative ratios, and suspicious distribution warnings.
    """
    from app.services.realworld_monitoring_service import get_label_quality_monitoring
    return get_label_quality_monitoring(db)


@router.get("/research/dataset/outcomes", response_model=OutcomeFunnelResponse, summary="Get outcome lifecycle conversion funnel statistics")
def get_outcome_funnel_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves recommendation outcome conversion funnel (RECOMMENDED -> ACCEPTED -> ASSIGNED -> COMPLETED) alongside alternate paths.
    """
    from app.services.realworld_monitoring_service import get_outcome_quality_funnel
    return get_outcome_quality_funnel(db)


@router.get("/research/dataset/diversity", response_model=DatasetDiversityResponse, summary="Get dataset diversity and concentration metrics")
def get_dataset_diversity_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluates dataset diversity across developers, tasks, projects, complexity, priority, and workload, flagging concentration skews.
    """
    from app.services.realworld_monitoring_service import get_dataset_diversity
    return get_dataset_diversity(db)


@router.get("/research/dataset/snapshots", response_model=List[DatasetSnapshotResponse], summary="List all versioned dataset snapshots")
def list_dataset_snapshots_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all versioned real-world dataset snapshot records.
    """
    from app.services.realworld_monitoring_service import list_dataset_snapshots
    return list_dataset_snapshots(db)


@router.post("/research/dataset/snapshots", response_model=DatasetSnapshotResponse, summary="Create an immutable versioned dataset snapshot")
def create_dataset_snapshot_api(
    req: DatasetSnapshotCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates an immutable versioned dataset snapshot record in PostgreSQL and writes JSON metadata to research/dataset/snapshots/{version}.json.
    Requires ADMIN or MANAGER role.
    """
    from app.services.realworld_monitoring_service import create_dataset_snapshot
    try:
        return create_dataset_snapshot(db, req.dataset_version, current_user.id, req.source_observation_range or "all_available")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tasks/{task_id}", response_model=RecommendationListResponse, summary="Get ranked developer recommendations for a task")
def get_task_recommendations(
    task_id: uuid.UUID,
    regenerate: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates and returns ranked developer candidates for a task with score explanations.
    Accessible to all authenticated users.
    """
    task = db.execute(select(Task).where(Task.id == task_id)).scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found.",
        )

    try:
        if regenerate:
            return generate_and_persist_task_recommendations(db, task_id)
        return get_persisted_task_recommendations(db, task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{id}", response_model=RecommendationResponse, summary="Get single recommendation detail")
def get_recommendation_by_id(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a single recommendation record with feature explanations.
    Accessible to all authenticated users.
    """
    stmt = (
        select(Recommendation)
        .options(
            joinedload(Recommendation.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Recommendation.explanations),
        )
        .where(Recommendation.id == id)
    )
    rec = db.execute(stmt).unique().scalar_one_or_none()

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recommendation record with ID {id} not found.",
        )

    dev = rec.developer_profile
    exp_responses = [
        RecommendationExplanationResponse(
            id=e.id,
            feature_name=e.feature_name,
            feature_value=e.feature_value,
            contribution_score=float(e.shap_value),
            direction=e.direction,
        )
        for e in (rec.explanations or [])
    ]

    return RecommendationResponse(
        id=rec.id,
        task_id=rec.task_id,
        developer_id=rec.developer_id,
        developer_name=dev.user.name if dev and dev.user else "Unknown",
        developer_email=dev.user.email if dev and dev.user else "",
        experience_years=float(dev.experience_years) if dev else 0.0,
        availability_status=dev.availability_status if dev else AvailabilityStatus.AVAILABLE,
        workload_score=0.0,
        skill_coverage_ratio=0.0,
        performance_score=float(dev.performance_score) if dev else 0.0,
        model_version=rec.model_version,
        score=float(rec.score),
        rank=rec.rank,
        created_at=rec.created_at,
        explanations=exp_responses,
    )


@router.get("/{id}/explanations", response_model=List[RecommendationExplanationResponse], summary="Get feature contribution explanations for recommendation")
def get_recommendation_explanations(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves feature contribution breakdown explanations for a specific recommendation.
    Accessible to all authenticated users.
    """
    stmt = (
        select(RecommendationExplanation)
        .where(RecommendationExplanation.recommendation_id == id)
    )
    exps = db.execute(stmt).scalars().all()

    return [
        RecommendationExplanationResponse(
            id=e.id,
            feature_name=e.feature_name,
            feature_value=e.feature_value,
            contribution_score=float(e.shap_value),
            direction=e.direction,
        )
        for e in exps
    ]
