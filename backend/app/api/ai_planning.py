import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database import get_db
from app.models.user import User
from app.models.ai_planning import AIProjectPlan, AIProjectPlanTask
from app.models.enums import UserRole, AIPlanStatus, AIPlanTaskStatus, TaskPriority, TaskComplexity
from app.schemas.ai_planning import (
    AIPlanningInput,
    AIProjectPlanResponse,
    AIPlanTaskCreate,
    AIPlanTaskUpdate,
    AIPlanTaskResponse,
    TeamCapabilityAnalysisResponse,
    PlanApplyRequest,
    PlanApplyResponse,
)
from app.api.deps import get_current_user, require_roles
from app.services.ai_planning_provider import get_ai_planning_provider, AIPlanningError
from app.services.ai_planning_capability_service import analyze_team_capability_for_plan
from app.services.ai_planning_apply_service import apply_ai_project_plan_atomically
from app.services.ai_planning_dependency_service import validate_task_dependencies

router = APIRouter()


def _normalize_skill_list(skills: Any) -> List[str]:
    if not skills:
        return []
    res = []
    for s in skills:
        if isinstance(s, str):
            res.append(s)
        elif isinstance(s, dict):
            name = s.get("skill_name") or s.get("name") or str(s)
            res.append(str(name))
        else:
            res.append(str(s))
    return res


def build_plan_task_response(t: AIProjectPlanTask) -> AIPlanTaskResponse:
    return AIPlanTaskResponse(
        id=t.id,
        plan_id=t.plan_id,
        title=t.title,
        description=t.description,
        module=t.module,
        priority=t.priority,
        complexity=t.complexity,
        estimated_hours=float(t.estimated_hours),
        required_skills=_normalize_skill_list(t.required_skills),
        dependencies=t.dependencies or [],
        acceptance_criteria=t.acceptance_criteria or [],
        status=t.status,
        is_manually_added=t.is_manually_added,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def build_plan_response(plan: AIProjectPlan) -> AIProjectPlanResponse:
    return AIProjectPlanResponse(
        id=plan.id,
        project_name=plan.project_name,
        project_description=plan.project_description,
        business_objective=plan.business_objective,
        target_users=plan.target_users,
        functional_requirements=plan.functional_requirements,
        technical_requirements=plan.technical_requirements,
        technology_stack=plan.technology_stack,
        deadline=plan.deadline,
        granularity=plan.granularity,
        project_type=plan.project_type,
        preferred_team_size=plan.preferred_team_size,
        status=plan.status,
        summary_json=plan.summary_json,
        ai_provider=plan.ai_provider,
        ai_model=plan.ai_model,
        prompt_version=plan.prompt_version,
        applied_project_id=plan.applied_project_id,
        created_by=plan.created_by,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        tasks=[build_plan_task_response(t) for t in (plan.tasks or [])],
    )


@router.post("/plans", response_model=AIProjectPlanResponse, status_code=status.HTTP_201_CREATED, summary="Generate new AI project plan draft")
def generate_ai_project_plan(
    input_data: AIPlanningInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Decomposes a natural language project description into an AI project plan draft.
    Requires ADMIN or MANAGER role. Returns HTTP 403 Forbidden for DEVELOPER role.
    """
    provider = get_ai_planning_provider()
    try:
        raw_result = provider.generate_project_plan(input_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Planning Service Temporarily Unavailable: {str(e)}",
        )

    summary = raw_result.get("summary", {})
    tasks_data = raw_result.get("tasks", [])

    plan = AIProjectPlan(
        project_name=input_data.project_name,
        project_description=input_data.project_description,
        business_objective=input_data.business_objective or summary.get("business_objective"),
        target_users=input_data.target_users or summary.get("primary_users"),
        functional_requirements=input_data.functional_requirements,
        technical_requirements=input_data.technical_requirements,
        technology_stack=input_data.technology_stack,
        deadline=input_data.deadline,
        granularity=input_data.granularity,
        project_type=input_data.project_type,
        preferred_team_size=input_data.preferred_team_size,
        status=AIPlanStatus.DRAFT,
        summary_json=summary,
        planning_input_snapshot=input_data.model_dump(),
        ai_provider=raw_result.get("ai_provider", "mock"),
        ai_model=raw_result.get("ai_model", "heuristic-v1"),
        prompt_version=raw_result.get("prompt_version", "v1.0"),
        created_by=current_user.id,
    )
    db.add(plan)
    db.flush()

    for t_dict in tasks_data:
        plan_task = AIProjectPlanTask(
            plan_id=plan.id,
            title=t_dict.get("title", "Untitled Task"),
            description=t_dict.get("description"),
            module=t_dict.get("module", "Core Architecture"),
            priority=t_dict.get("priority", TaskPriority.MEDIUM),
            complexity=t_dict.get("complexity", TaskComplexity.MEDIUM),
            estimated_hours=Decimal(str(t_dict.get("estimated_hours", 8.0))),
            required_skills=t_dict.get("required_skills", []),
            dependencies=t_dict.get("dependencies", []),
            acceptance_criteria=t_dict.get("acceptance_criteria", []),
            status=AIPlanTaskStatus.PROPOSED,
            is_manually_added=False,
        )
        db.add(plan_task)

    db.commit()
    db.refresh(plan)
    return build_plan_response(plan)


@router.get("/plans", response_model=List[AIProjectPlanResponse], summary="List AI project plan drafts")
def list_ai_project_plans(
    status_filter: Optional[AIPlanStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Lists generated AI project plan drafts.
    Requires ADMIN or MANAGER role.
    """
    stmt = select(AIProjectPlan).order_by(desc(AIProjectPlan.created_at))
    if status_filter:
        stmt = stmt.where(AIProjectPlan.status == status_filter)

    plans = db.execute(stmt).scalars().all()
    return [build_plan_response(p) for p in plans]


@router.get("/plans/{id}", response_model=AIProjectPlanResponse, summary="Get AI project plan details")
def get_ai_project_plan(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Retrieves details for a specific AI project plan draft.
    Requires ADMIN or MANAGER role.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == id)
    ).scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Project Plan with ID {id} not found.",
        )

    return build_plan_response(plan)


@router.put("/plans/{id}", response_model=AIProjectPlanResponse, summary="Update AI project plan metadata or status")
def update_ai_project_plan(
    id: uuid.UUID,
    status_update: Optional[AIPlanStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates status or metadata for an AI project plan.
    Requires ADMIN or MANAGER role.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == id)
    ).scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Project Plan with ID {id} not found.",
        )

    if status_update:
        plan.status = status_update

    db.commit()
    db.refresh(plan)
    return build_plan_response(plan)


@router.post("/plans/{id}/regenerate", response_model=AIProjectPlanResponse, summary="Regenerate AI project plan")
def regenerate_ai_project_plan(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Regenerates AI plan tasks from input snapshot.
    Requires ADMIN or MANAGER role.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == id)
    ).scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Project Plan with ID {id} not found.",
        )

    input_snapshot = plan.planning_input_snapshot or {
        "project_name": plan.project_name,
        "project_description": plan.project_description,
        "granularity": plan.granularity,
        "project_type": plan.project_type,
    }

    try:
        input_obj = AIPlanningInput(**input_snapshot)
        provider = get_ai_planning_provider()
        raw_result = provider.generate_project_plan(input_obj)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Planning Service Temporarily Unavailable: {str(e)}",
        )

    # Delete non-manually added tasks
    db.execute(
        select(AIProjectPlanTask)
        .where(AIProjectPlanTask.plan_id == id, AIProjectPlanTask.is_manually_added == False)
    )
    for t in list(plan.tasks):
        if not t.is_manually_added:
            db.delete(t)

    summary = raw_result.get("summary", {})
    plan.summary_json = summary

    for t_dict in raw_result.get("tasks", []):
        plan_task = AIProjectPlanTask(
            plan_id=plan.id,
            title=t_dict.get("title", "Untitled Task"),
            description=t_dict.get("description"),
            module=t_dict.get("module", "Core Architecture"),
            priority=t_dict.get("priority", TaskPriority.MEDIUM),
            complexity=t_dict.get("complexity", TaskComplexity.MEDIUM),
            estimated_hours=Decimal(str(t_dict.get("estimated_hours", 8.0))),
            required_skills=t_dict.get("required_skills", []),
            dependencies=t_dict.get("dependencies", []),
            acceptance_criteria=t_dict.get("acceptance_criteria", []),
            status=AIPlanTaskStatus.PROPOSED,
            is_manually_added=False,
        )
        db.add(plan_task)

    db.commit()
    db.refresh(plan)
    return build_plan_response(plan)


@router.post("/plans/{plan_id}/tasks", response_model=AIPlanTaskResponse, status_code=status.HTTP_201_CREATED, summary="Add manual task to plan draft")
def add_manual_task_to_plan(
    plan_id: uuid.UUID,
    task_in: AIPlanTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Adds a new manual task to an AI project plan draft.
    Requires ADMIN or MANAGER role.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == plan_id)
    ).scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Project Plan with ID {plan_id} not found.",
        )

    task = AIProjectPlanTask(
        plan_id=plan.id,
        title=task_in.title,
        description=task_in.description,
        module=task_in.module or "Core Architecture",
        priority=task_in.priority,
        complexity=task_in.complexity,
        estimated_hours=Decimal(str(task_in.estimated_hours)),
        required_skills=task_in.required_skills,
        dependencies=task_in.dependencies,
        acceptance_criteria=task_in.acceptance_criteria,
        status=AIPlanTaskStatus.APPROVED,
        is_manually_added=True,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return build_plan_task_response(task)


@router.put("/plans/{plan_id}/tasks/{task_id}", response_model=AIPlanTaskResponse, summary="Edit proposed task in plan draft")
def update_plan_task(
    plan_id: uuid.UUID,
    task_id: uuid.UUID,
    task_in: AIPlanTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Edits task attributes (title, priority, complexity, hours, skills, status) in a plan draft.
    Requires ADMIN or MANAGER role.
    """
    task = db.execute(
        select(AIProjectPlanTask).where(
            AIProjectPlanTask.id == task_id,
            AIProjectPlanTask.plan_id == plan_id,
        )
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan task with ID {task_id} not found in plan {plan_id}.",
        )

    old_title = task.title
    if task_in.title is not None and task_in.title != old_title:
        new_title = task_in.title
        task.title = new_title
        # Cascade title rename to dependent tasks in the same plan
        for other in task.plan.tasks:
            if other.id != task.id and other.dependencies:
                if old_title in other.dependencies:
                    other.dependencies = [new_title if dep == old_title else dep for dep in other.dependencies]

    if task_in.description is not None:
        task.description = task_in.description
    if task_in.module is not None:
        task.module = task_in.module
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.complexity is not None:
        task.complexity = task_in.complexity
    if task_in.estimated_hours is not None:
        task.estimated_hours = Decimal(str(task_in.estimated_hours))
    if task_in.required_skills is not None:
        task.required_skills = task_in.required_skills
    if task_in.dependencies is not None:
        task.dependencies = task_in.dependencies
    if task_in.acceptance_criteria is not None:
        task.acceptance_criteria = task_in.acceptance_criteria
    if task_in.status is not None:
        task.status = task_in.status
    else:
        task.status = AIPlanTaskStatus.EDITED

    db.commit()
    db.refresh(task)
    return build_plan_task_response(task)


@router.delete("/plans/{plan_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Exclude or delete proposed task from plan")
def delete_plan_task(
    plan_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Excludes or permanently deletes a proposed task from a plan draft.
    Requires ADMIN or MANAGER role.
    """
    task = db.execute(
        select(AIProjectPlanTask).where(
            AIProjectPlanTask.id == task_id,
            AIProjectPlanTask.plan_id == plan_id,
        )
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan task with ID {task_id} not found in plan {plan_id}.",
        )

    deleted_title = task.title
    plan = task.plan

    # Remove deleted task reference from other tasks' dependencies
    if plan and plan.tasks:
        for other in plan.tasks:
            if other.id != task.id and other.dependencies and deleted_title in other.dependencies:
                other.dependencies = [dep for dep in other.dependencies if dep != deleted_title]

    db.delete(task)
    db.commit()
    return None


@router.get("/plans/{id}/capability-analysis", response_model=TeamCapabilityAnalysisResponse, summary="Get team capability analysis for plan")
def get_plan_capability_analysis(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Analyzes proposed plan tasks against existing team developer skills and workloads.
    Classifies tasks into WELL_SUPPORTED, CAPACITY_RISK, and SKILL_GAP.
    Requires ADMIN or MANAGER role.
    """
    try:
        analysis = analyze_team_capability_for_plan(db, id)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/plans/{id}/apply", response_model=PlanApplyResponse, summary="Approve and apply AI project plan atomically")
def apply_ai_project_plan(
    id: uuid.UUID,
    apply_req: PlanApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Approves AI project plan and atomically creates real production Project, Task, TaskSkill records,
    and runs automatic Task Weight calculations.
    Requires ADMIN or MANAGER role.
    """
    try:
        res = apply_ai_project_plan_atomically(
            db=db,
            plan_id=id,
            apply_req=apply_req,
            current_user=current_user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
