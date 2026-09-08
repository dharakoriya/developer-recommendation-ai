import uuid
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.database import get_db
from app.models.task import Task, Assignment
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole, TaskStatus, AssignmentStatus
from app.schemas.task import (
    AssignmentCreate,
    AssignmentUpdateStatus,
    AssignmentResponse,
)
from app.api.deps import get_current_user, require_roles
from app.api.tasks import build_assignment_response
from app.services.recommendation_service import invalidate_all_recommendations


router = APIRouter()


@router.get("/assignments", response_model=List[AssignmentResponse], summary="List all task assignments")
def list_all_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all task assignments across all tasks and developers.
    Accessible to all authenticated users.
    """
    stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Assignment.assigner),
            joinedload(Assignment.task),
        )
        .order_by(Assignment.assigned_at.desc())
    )
    assignments = db.execute(stmt).unique().scalars().all()
    return [build_assignment_response(a) for a in assignments]


@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED, summary="Create task assignment directly")
def create_assignment_direct(
    assign_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new assignment directly using task_id specified in assign_in.
    Requires ADMIN or MANAGER role.
    """
    if not assign_in.task_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="task_id is required to create an assignment.",
        )
    return assign_task(id=assign_in.task_id, assign_in=assign_in, db=db, current_user=current_user)


@router.post("/tasks/{id}/assign", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED, summary="Assign task to developer")
def assign_task(
    id: uuid.UUID,
    assign_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Assigns a task to a developer profile.
    If an active assignment exists, it is non-destructively marked REASSIGNED.
    Requires ADMIN or MANAGER role.
    """
    task = db.execute(
        select(Task).where(Task.id == id)
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    dev_profile = db.execute(
        select(DeveloperProfile)
        .options(joinedload(DeveloperProfile.user))
        .where(DeveloperProfile.id == assign_in.developer_id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {assign_in.developer_id} not found.",
        )

    # Check for existing active assignment
    existing_active = db.execute(
        select(Assignment).where(
            Assignment.task_id == id,
            Assignment.status == AssignmentStatus.ACTIVE,
        )
    ).scalar_one_or_none()

    if existing_active:
        if existing_active.developer_id == assign_in.developer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Developer is already actively assigned to this task.",
            )
        # Mark previous assignment as REASSIGNED (non-destructive history)
        existing_active.status = AssignmentStatus.REASSIGNED
        existing_active.reassigned_at = func.now()

    # Create new active assignment
    new_assignment = Assignment(
        task_id=id,
        developer_id=assign_in.developer_id,
        assigned_by=current_user.id,
        status=AssignmentStatus.ACTIVE,
        notes=assign_in.notes,
    )
    db.add(new_assignment)

    # Update task status to IN_PROGRESS if currently TODO
    if task.status == TaskStatus.TODO:
        task.status = TaskStatus.IN_PROGRESS

    db.commit()

    # Link assignment outcome tracking
    from app.services.outcome_dataset_service import update_assignment_outcome
    update_assignment_outcome(db, new_assignment)
    invalidate_all_recommendations(db)

    stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Assignment.assigner),
        )
        .where(Assignment.id == new_assignment.id)
    )
    assignment = db.execute(stmt).scalar_one()
    return build_assignment_response(assignment)


@router.get("/tasks/{id}/assignments", response_model=List[AssignmentResponse], summary="List task assignment history")
def list_task_assignment_history(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns complete auditable assignment history for a task.
    Accessible to all authenticated users.
    """
    task = db.execute(
        select(Task).where(Task.id == id)
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Assignment.assigner),
        )
        .where(Assignment.task_id == id)
        .order_by(Assignment.assigned_at.desc())
    )
    assignments = db.execute(stmt).scalars().all()
    return [build_assignment_response(a) for a in assignments]


@router.get("/developers/{developer_id}/assignments", response_model=List[AssignmentResponse], summary="List developer assignments")
def list_developer_assignments(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists assignments for a developer profile.
    Accessible to ADMIN, MANAGER, or self.
    """
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    if current_user.role == UserRole.DEVELOPER and dev_profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only view your own developer assignments.",
        )

    stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Assignment.assigner),
        )
        .where(Assignment.developer_id == developer_id)
        .order_by(Assignment.assigned_at.desc())
    )
    assignments = db.execute(stmt).scalars().all()
    return [build_assignment_response(a) for a in assignments]


@router.put("/assignments/{assignment_id}/status", response_model=AssignmentResponse, summary="Update assignment status")
def update_assignment_status(
    assignment_id: uuid.UUID,
    status_in: AssignmentUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the status of an assignment.
    ADMIN, MANAGER, or the assigned DEVELOPER can mark COMPLETED.
    """
    stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Assignment.assigner),
            joinedload(Assignment.task),
        )
        .where(Assignment.id == assignment_id)
    )
    assignment = db.execute(stmt).scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID {assignment_id} not found.",
        )

    # Permission check: DEVELOPER can only update their own assignment
    if current_user.role == UserRole.DEVELOPER:
        if assignment.developer_profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden. You can only update status on your assigned tasks.",
            )

    assignment.status = status_in.status
    if status_in.notes is not None:
        assignment.notes = status_in.notes

    if status_in.status == AssignmentStatus.COMPLETED:
        assignment.completed_at = func.now()
        if assignment.task:
            assignment.task.status = TaskStatus.COMPLETED

        # Calculate & persist task weight
        from app.services.task_weight_service import calculate_task_weight_score
        task_weight = calculate_task_weight_score(assignment.task)
        assignment.task.task_weight_score = Decimal(str(task_weight))
        db.commit()

        # Performance Intelligence triggers
        from app.services.performance_service import (
            update_developer_streak_on_task_completion,
            evaluate_and_grant_developer_achievements,
            calculate_and_record_incentive_points,
            snapshot_developer_performance,
        )
        update_developer_streak_on_task_completion(db, assignment.developer_id, task_weight)
        calculate_and_record_incentive_points(db, assignment.developer_id, assignment.task_id)
        evaluate_and_grant_developer_achievements(db, assignment.developer_id)
        snapshot_developer_performance(db, assignment.developer_id)
    elif status_in.status == AssignmentStatus.CANCELLED:
        assignment.reassigned_at = func.now()

    db.commit()
    db.refresh(assignment)
    invalidate_all_recommendations(db)
    return build_assignment_response(assignment)


@router.post("/assignments/{assignment_id}/complete", response_model=AssignmentResponse, summary="Complete an assignment")
def complete_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Shortcut to mark an assignment completed and update task status to COMPLETED.
    """
    return update_assignment_status(
        assignment_id=assignment_id,
        status_in=AssignmentUpdateStatus(status=AssignmentStatus.COMPLETED),
        db=db,
        current_user=current_user,
    )


@router.post("/assignments/{assignment_id}/cancel", response_model=AssignmentResponse, summary="Cancel an assignment")
def cancel_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Shortcut to cancel an assignment. Requires ADMIN or MANAGER role.
    """
    return update_assignment_status(
        assignment_id=assignment_id,
        status_in=AssignmentUpdateStatus(status=AssignmentStatus.CANCELLED),
        db=db,
        current_user=current_user,
    )
