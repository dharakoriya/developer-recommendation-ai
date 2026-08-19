import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.developer import DeveloperProfile
from app.models.task import Task
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.feature import (
    FeatureMetadataItem,
    CandidateFeatureVector,
    TaskCandidatesResponse,
    DatasetExportResponse,
)
from app.services.feature_engineering_service import (
    get_feature_metadata_catalog,
    extract_developer_task_feature_vector,
    generate_task_candidate_features,
    export_dataset_csv,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/metadata", response_model=List[FeatureMetadataItem], summary="Get feature engineering metadata catalog")
def get_feature_metadata(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the central feature definition catalog detailing feature names, data types, categories, sources, and descriptions.
    Accessible to all authenticated users.
    """
    return get_feature_metadata_catalog()


@router.get("/tasks/{task_id}/candidates", response_model=TaskCandidatesResponse, summary="Generate candidate feature vectors for a task")
def get_task_candidate_features(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates deterministic candidate feature vectors for all developer profiles for a specific task.
    Accessible to all authenticated users.
    """
    task = db.execute(select(Task).where(Task.id == task_id)).scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found.",
        )

    try:
        return generate_task_candidate_features(db, task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/pair/{developer_id}/{task_id}", response_model=CandidateFeatureVector, summary="Extract feature vector for developer-task pair")
def get_developer_task_pair_features(
    developer_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Extracts structured feature vector for a specific (Developer, Task) candidate pair.
    Accessible to all authenticated users.
    """
    dev = db.execute(select(DeveloperProfile).where(DeveloperProfile.id == developer_id)).scalar_one_or_none()
    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    task = db.execute(select(Task).where(Task.id == task_id)).scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found.",
        )

    try:
        return extract_developer_task_feature_vector(db, developer_id, task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/dataset/export", response_model=DatasetExportResponse, summary="Export ML-ready feature dataset CSV")
def export_feature_dataset(
    project_id: Optional[uuid.UUID] = Query(None, description="Optional project ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Exports the generated candidate feature vectors as a structured CSV dataset.
    Requires ADMIN or MANAGER role.
    """
    try:
        return export_dataset_csv(db, project_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export dataset: {str(e)}",
        )


@router.get("/dataset/download.csv", summary="Download dataset as raw CSV file")
def download_feature_dataset_csv(
    project_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Downloads the dataset as a raw CSV file response.
    Requires ADMIN or MANAGER role.
    """
    dataset_res = export_dataset_csv(db, project_id)
    return Response(
        content=dataset_res.csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="devalign_recommendation_features.csv"'},
    )
