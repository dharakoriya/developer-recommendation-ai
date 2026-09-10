import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.api.deps import get_current_user, require_roles
from app.services.risk_assessment_service import (
    assess_task_risk,
    assess_developer_delivery_risk,
    assess_project_risk,
    get_system_risk_summary,
)


router = APIRouter()


@router.get("/summary", summary="System-wide risk summary dashboard")
def get_risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Returns aggregated platform risk summary metrics across projects, tasks, and developers.
    Accessible to ADMIN and MANAGER roles.
    """
    return get_system_risk_summary(db)


@router.get("/projects/{project_id}", summary="Get project risk assessment")
def get_project_risk(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Evaluates project-level risk, task risk breakdown, and manager recommended actions.
    Accessible to ADMIN and MANAGER roles.
    """
    try:
        return assess_project_risk(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/tasks/{task_id}", summary="Get task risk assessment")
def get_task_risk(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.DEVELOPER)),
):
    """
    Evaluates risk drivers and breakdown for a single task.
    Accessible to ADMIN, MANAGER, and assigned DEVELOPER.
    """
    try:
        return assess_task_risk(db, task_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/developers/{developer_id}", summary="Get developer delivery risk assessment")
def get_developer_risk(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluates developer delivery risk and capacity signals.
    Developers can only access their own delivery risk profile.
    ADMIN and MANAGER can view any developer's risk profile.
    """
    if current_user.role == UserRole.DEVELOPER:
        if not current_user.developer_profile or current_user.developer_profile.id != developer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Developers can only view their own delivery risk profile.",
            )
    try:
        return assess_developer_delivery_risk(db, developer_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
