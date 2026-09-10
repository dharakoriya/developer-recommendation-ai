import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.database import get_db
from app.models.project import Project, Team
from app.models.task import Task, TaskSkill, Assignment
from app.models.skill import Skill
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole, TaskStatus, AssignmentStatus
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskSkillCreate,
    TaskSkillUpdate,
    TaskSkillResponse,
    AssignmentResponse,
)
from app.api.deps import get_current_user, require_roles
from app.services.recommendation_service import invalidate_task_recommendations

router = APIRouter()


def build_task_skill_response(ts: TaskSkill) -> TaskSkillResponse:
    s = ts.skill
    return TaskSkillResponse(
        id=ts.id,
        task_id=ts.task_id,
        skill_id=ts.skill_id,
        skill_name=s.name if s else "Unknown",
        skill_category=s.category if s else None,
        required_level=ts.required_level,
        created_at=ts.created_at,
    )


def build_assignment_response(assign: Assignment) -> AssignmentResponse:
    dev = assign.developer_profile
    dev_user = dev.user if dev else None
    assigner = assign.assigner
    return AssignmentResponse(
        id=assign.id,
        task_id=assign.task_id,
        developer_id=assign.developer_id,
        developer_name=dev_user.name if dev_user else "Unknown",
        developer_email=dev_user.email if dev_user else "",
        assigned_by=assign.assigned_by,
        assigner_name=assigner.name if assigner else "Unknown",
        status=assign.status,
        assigned_at=assign.assigned_at,
        completed_at=assign.completed_at,
        reassigned_at=assign.reassigned_at,
        notes=assign.notes,
    )


def build_task_response(task: Task) -> TaskResponse:
    proj = task.project
    team = task.team
    creator = task.creator
    skills_resp = [build_task_skill_response(ts) for ts in (task.task_skills or [])]

    all_assigns = sorted(task.assignments or [], key=lambda a: a.assigned_at, reverse=True)
    history_resp = [build_assignment_response(a) for a in all_assigns]

    active_assign = next((a for a in all_assigns if a.status == AssignmentStatus.ACTIVE), None)
    curr_resp = build_assignment_response(active_assign) if active_assign else None

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        project_name=proj.name if proj else None,
        team_id=task.team_id,
        team_name=team.name if team else None,
        title=task.title,
        description=task.description,
        category=task.category,
        priority=task.priority,
        complexity=task.complexity,
        estimated_hours=task.estimated_hours,
        deadline=task.deadline,
        status=task.status,
        created_by=task.created_by,
        creator_name=creator.name if creator else "Unknown",
        created_at=task.created_at,
        updated_at=task.updated_at,
        required_skills=skills_resp,
        current_assignment=curr_resp,
        assignment_history=history_resp,
    )


def get_task_options():
    return [
        joinedload(Task.project),
        joinedload(Task.team),
        joinedload(Task.creator),
        joinedload(Task.task_skills).joinedload(TaskSkill.skill),
        joinedload(Task.assignments).joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
        joinedload(Task.assignments).joinedload(Assignment.assigner),
    ]


# Task CRUD Routes
@router.get("/tasks", response_model=List[TaskResponse], summary="List all tasks")
def list_all_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    project_id: Optional[uuid.UUID] = Query(None, alias="project_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all tasks across projects, optionally filtered by status or project_id.
    Accessible to all authenticated users.
    """
    query = select(Task).options(*get_task_options())
    if status_filter:
        query = query.where(Task.status == status_filter)
    if project_id:
        query = query.where(Task.project_id == project_id)

    query = query.order_by(Task.created_at.desc())
    tasks = db.execute(query).unique().scalars().all()
    return [build_task_response(t) for t in tasks]


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary="Create task directly")
def create_task_direct(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new task directly with project_id specified in task_in.
    Requires ADMIN or MANAGER role.
    """
    if not task_in.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required to create a task.",
        )
    return create_task(project_id=task_in.project_id, task_in=task_in, db=db, current_user=current_user)


@router.get("/tasks/project/{project_id}", response_model=List[TaskResponse], summary="List tasks in project (alias)")
def list_tasks_by_project_alias(
    project_id: uuid.UUID,
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Alias route for listing tasks belonging to a specific project.
    """
    return list_project_tasks(project_id=project_id, status_filter=status_filter, db=db, current_user=current_user)


@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse], summary="List tasks in project")
def list_project_tasks(
    project_id: uuid.UUID,
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists tasks belonging to a specific project.
    Accessible to all authenticated users.
    """
    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    query = select(Task).options(*get_task_options()).where(Task.project_id == project_id)
    if status_filter:
        query = query.where(Task.status == status_filter)

    query = query.order_by(Task.created_at.desc())
    tasks = db.execute(query).unique().scalars().all()
    return [build_task_response(t) for t in tasks]


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary="Create task in project")
def create_task(
    project_id: uuid.UUID,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new task within a project.
    Requires ADMIN or MANAGER role.
    """
    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    if task_in.team_id:
        team = db.execute(
            select(Team).where(Team.id == task_in.team_id, Team.project_id == project_id)
        ).scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with ID {task_in.team_id} not found in this project.",
            )

    new_task = Task(
        project_id=project_id,
        team_id=task_in.team_id,
        title=task_in.title,
        description=task_in.description,
        category=task_in.category,
        priority=task_in.priority,
        complexity=task_in.complexity,
        estimated_hours=task_in.estimated_hours,
        deadline=task_in.deadline,
        status=task_in.status,
        created_by=current_user.id,
    )
    db.add(new_task)
    db.commit()

    stmt = select(Task).options(*get_task_options()).where(Task.id == new_task.id)
    task = db.execute(stmt).unique().scalar_one()
    return build_task_response(task)


@router.get("/tasks/{id}", response_model=TaskResponse, summary="Get task details")
def get_task(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves task details by ID including required skills and assignment history.
    Accessible to all authenticated users.
    """
    stmt = select(Task).options(*get_task_options()).where(Task.id == id)
    task = db.execute(stmt).unique().scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    return build_task_response(task)


@router.put("/tasks/{id}", response_model=TaskResponse, summary="Update task")
def update_task(
    id: uuid.UUID,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates task fields and status.
    Requires ADMIN or MANAGER role.
    """
    stmt = select(Task).options(*get_task_options()).where(Task.id == id)
    task = db.execute(stmt).unique().scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    if task_in.team_id is not None:
        if task_in.team_id != task.team_id:
            team = db.execute(
                select(Team).where(Team.id == task_in.team_id, Team.project_id == task.project_id)
            ).scalar_one_or_none()
            if not team:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Team with ID {task_in.team_id} not found in this project.",
                )
        task.team_id = task_in.team_id

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.category is not None:
        task.category = task_in.category
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.complexity is not None:
        task.complexity = task_in.complexity
    if task_in.estimated_hours is not None:
        task.estimated_hours = task_in.estimated_hours
    if task_in.deadline is not None:
        task.deadline = task_in.deadline
    if task_in.status is not None and task_in.status != task.status:
        # Enforce valid task status transitions
        ALLOWED_TRANSITIONS = {
            TaskStatus.TODO: [TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
            TaskStatus.READY: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
            TaskStatus.IN_PROGRESS: [TaskStatus.IN_REVIEW, TaskStatus.COMPLETED, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
            TaskStatus.IN_REVIEW: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
            TaskStatus.BLOCKED: [TaskStatus.IN_PROGRESS, TaskStatus.READY, TaskStatus.CANCELLED],
            TaskStatus.COMPLETED: [],
            TaskStatus.CANCELLED: [],
        }
        if task.status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task is currently {task.status.value}. Use POST /api/tasks/{id}/reopen to explicitly reopen it.",
            )
        allowed = ALLOWED_TRANSITIONS.get(task.status, [])
        if task_in.status not in allowed:
            allowed_names = [s.value for s in allowed]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task status transition from {task.status.value} to {task_in.status.value}. Allowed transitions: {allowed_names}.",
            )
        task.status = task_in.status

        if task_in.status == TaskStatus.COMPLETED:
            # Handle task completion metrics & assignments
            active_assign = next((a for a in (task.assignments or []) if a.status == AssignmentStatus.ACTIVE), None)
            if active_assign:
                active_assign.status = AssignmentStatus.COMPLETED
                active_assign.completed_at = func.now()

                from app.services.task_weight_service import calculate_task_weight_score
                task_weight = calculate_task_weight_score(task)
                task.task_weight_score = Decimal(str(task_weight))
                db.commit()

                from app.services.performance_service import (
                    update_developer_streak_on_task_completion,
                    evaluate_and_grant_developer_achievements,
                    calculate_and_record_incentive_points,
                    snapshot_developer_performance,
                )
                from app.services.outcome_dataset_service import update_assignment_outcome

                update_developer_streak_on_task_completion(db, active_assign.developer_id, task_weight)
                calculate_and_record_incentive_points(db, active_assign.developer_id, task.id)
                evaluate_and_grant_developer_achievements(db, active_assign.developer_id)
                snapshot_developer_performance(db, active_assign.developer_id)
                update_assignment_outcome(db, active_assign)

    db.commit()
    db.refresh(task)
    invalidate_task_recommendations(db, id)
    return build_task_response(task)


@router.patch("/tasks/{id}/status", response_model=TaskResponse, summary="Update task status")
def update_task_status(
    id: uuid.UUID,
    status_in: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates task status following valid transition rules.
    """
    stmt = select(Task).options(*get_task_options()).where(Task.id == id)
    task = db.execute(stmt).unique().scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    new_status_str = status_in.get("status")
    if not new_status_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'status' is required.",
        )

    try:
        new_status = TaskStatus(new_status_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid task status '{new_status_str}'.",
        )

    if task.status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task is currently {task.status.value}. Use POST /api/tasks/{id}/reopen to explicitly reopen it.",
        )

    ALLOWED_TRANSITIONS = {
        TaskStatus.TODO: [TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
        TaskStatus.READY: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
        TaskStatus.IN_PROGRESS: [TaskStatus.IN_REVIEW, TaskStatus.COMPLETED, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
        TaskStatus.IN_REVIEW: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED],
        TaskStatus.BLOCKED: [TaskStatus.IN_PROGRESS, TaskStatus.READY, TaskStatus.CANCELLED],
        TaskStatus.COMPLETED: [],
        TaskStatus.CANCELLED: [],
    }

    allowed = ALLOWED_TRANSITIONS.get(task.status, [])
    if new_status not in allowed:
        allowed_names = [s.value for s in allowed]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {task.status.value} to {new_status.value}. Allowed transitions: {allowed_names}.",
        )

    task.status = new_status
    if status_in.get("blocker_reason"):
        task.description = f"[BLOCKER]: {status_in.get('blocker_reason')}\n" + (task.description or "")

    if new_status == TaskStatus.COMPLETED:
        active_assign = next((a for a in (task.assignments or []) if a.status == AssignmentStatus.ACTIVE), None)
        if active_assign:
            active_assign.status = AssignmentStatus.COMPLETED
            active_assign.completed_at = func.now()

            from app.services.task_weight_service import calculate_task_weight_score
            task_weight = calculate_task_weight_score(task)
            task.task_weight_score = Decimal(str(task_weight))
            db.commit()

            from app.services.performance_service import (
                update_developer_streak_on_task_completion,
                evaluate_and_grant_developer_achievements,
                calculate_and_record_incentive_points,
                snapshot_developer_performance,
            )
            from app.services.outcome_dataset_service import update_assignment_outcome

            update_developer_streak_on_task_completion(db, active_assign.developer_id, task_weight)
            calculate_and_record_incentive_points(db, active_assign.developer_id, task.id)
            evaluate_and_grant_developer_achievements(db, active_assign.developer_id)
            snapshot_developer_performance(db, active_assign.developer_id)
            update_assignment_outcome(db, active_assign)

    db.commit()
    db.refresh(task)
    invalidate_task_recommendations(db, id)
    return build_task_response(task)


@router.post("/tasks/{id}/reopen", response_model=TaskResponse, summary="Reopen completed or cancelled task")
def reopen_task(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Reopens a completed or cancelled task back to TODO status.
    Requires ADMIN or MANAGER role.
    """
    stmt = select(Task).options(*get_task_options()).where(Task.id == id)
    task = db.execute(stmt).unique().scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    if task.status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task is currently in {task.status.value} status and does not need reopening.",
        )

    task.status = TaskStatus.TODO
    db.commit()
    db.refresh(task)
    invalidate_task_recommendations(db, id)
    return build_task_response(task)



@router.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task")
def delete_task(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Deletes a task and its associated skill requirements.
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

    db.delete(task)
    db.commit()
    return None


# Task Skills Routes
@router.get("/tasks/{id}/skills", response_model=List[TaskSkillResponse], summary="List task required skills")
def list_task_skills(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists required skills for a specific task.
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
        select(TaskSkill)
        .options(joinedload(TaskSkill.skill))
        .where(TaskSkill.task_id == id)
        .order_by(TaskSkill.created_at.asc())
    )
    skills = db.execute(stmt).scalars().all()
    return [build_task_skill_response(ts) for ts in skills]


@router.post("/tasks/{id}/skills", response_model=TaskSkillResponse, status_code=status.HTTP_201_CREATED, summary="Add required skill to task")
def add_task_skill(
    id: uuid.UUID,
    skill_in: TaskSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Adds a required skill to a task with target proficiency level (0..100).
    Requires ADMIN or MANAGER role.
    Prevents adding the same skill twice.
    """
    task = db.execute(
        select(Task).where(Task.id == id)
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {id} not found.",
        )

    skill = db.execute(
        select(Skill).where(Skill.id == skill_in.skill_id)
    ).scalar_one_or_none()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_in.skill_id} not found.",
        )

    existing = db.execute(
        select(TaskSkill).where(
            TaskSkill.task_id == id,
            TaskSkill.skill_id == skill_in.skill_id,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill is already required for this task.",
        )

    new_task_skill = TaskSkill(
        task_id=id,
        skill_id=skill_in.skill_id,
        required_level=skill_in.required_level,
    )
    db.add(new_task_skill)
    db.commit()
    invalidate_task_recommendations(db, id)

    stmt = (
        select(TaskSkill)
        .options(joinedload(TaskSkill.skill))
        .where(TaskSkill.id == new_task_skill.id)
    )
    ts = db.execute(stmt).scalar_one()
    return build_task_skill_response(ts)


@router.put("/tasks/{id}/skills/{skill_id}", response_model=TaskSkillResponse, summary="Update required skill level")
def update_task_skill(
    id: uuid.UUID,
    skill_id: uuid.UUID,
    skill_in: TaskSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates the required proficiency level of a task skill.
    Requires ADMIN or MANAGER role.
    """
    task_skill = db.execute(
        select(TaskSkill)
        .options(joinedload(TaskSkill.skill))
        .where(TaskSkill.task_id == id, TaskSkill.skill_id == skill_id)
    ).scalar_one_or_none()

    if not task_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Required skill association for task ID {id} and skill ID {skill_id} not found.",
        )

    task_skill.required_level = skill_in.required_level
    db.commit()
    db.refresh(task_skill)
    invalidate_task_recommendations(db, id)
    return build_task_skill_response(task_skill)


@router.delete("/tasks/{id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove required skill from task")
def delete_task_skill(
    id: uuid.UUID,
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Removes a required skill association from a task.
    Requires ADMIN or MANAGER role.
    """
    task_skill = db.execute(
        select(TaskSkill).where(
            TaskSkill.task_id == id,
            TaskSkill.skill_id == skill_id,
        )
    ).scalar_one_or_none()

    if not task_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Required skill association for task ID {id} and skill ID {skill_id} not found.",
        )

    db.delete(task_skill)
    db.commit()
    invalidate_task_recommendations(db, id)
    return None
