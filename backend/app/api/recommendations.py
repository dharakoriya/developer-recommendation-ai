import uuid
from typing import List
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
