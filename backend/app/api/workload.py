import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.workload import (
    WorkloadSummaryItem,
    WorkloadSummaryResponse,
    DeveloperWorkloadDetailResponse,
    WorkloadRecordResponse,
)
from app.services.workload_service import (
    calculate_developer_workload_details,
    get_system_workload_summary,
    create_workload_snapshot,
    get_developer_workload_history,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=List[WorkloadSummaryItem], summary="Get workload overview for all developers")
def list_workload_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns deterministic workload metrics for all developer profiles.
    Accessible to all authenticated users.
    """
    summary = get_system_workload_summary(db)
    return summary.developers


@router.get("/summary", response_model=WorkloadSummaryResponse, summary="Get system workload aggregate summary")
def get_workload_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregate workload metrics across all developers.
    Accessible to all authenticated users.
    """
    return get_system_workload_summary(db)


@router.get("/developers/{id}", response_model=DeveloperWorkloadDetailResponse, summary="Get developer workload details")
def get_developer_workload(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves detailed workload calculation breakdown and active assigned tasks for a developer.
    Accessible to ADMIN, MANAGER, or self.
    """
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {id} not found.",
        )

    if current_user.role == UserRole.DEVELOPER and dev_profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only view your own workload details.",
        )

    try:
        return calculate_developer_workload_details(db, id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/developers/{id}/snapshot", response_model=WorkloadRecordResponse, status_code=status.HTTP_201_CREATED, summary="Create workload snapshot")
def take_workload_snapshot(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates and records a historical workload snapshot in workload_records table.
    Requires ADMIN or MANAGER role.
    """
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {id} not found.",
        )

    try:
        return create_workload_snapshot(db, id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/developers/{id}/history", response_model=List[WorkloadRecordResponse], summary="Get developer workload snapshot history")
def get_workload_history(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns historical workload snapshot records for a developer profile.
    Accessible to ADMIN, MANAGER, or self.
    """
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {id} not found.",
        )

    if current_user.role == UserRole.DEVELOPER and dev_profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only view your own workload history.",
        )

    return get_developer_workload_history(db, id)
