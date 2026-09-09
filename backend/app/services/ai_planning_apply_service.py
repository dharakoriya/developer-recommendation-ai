import uuid
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.ai_planning import AIProjectPlan, AIProjectPlanTask
from app.models.project import Project
from app.models.task import Task, TaskSkill
from app.models.skill import Skill
from app.models.user import User
from app.models.enums import AIPlanStatus, AIPlanTaskStatus, TaskStatus
from app.schemas.ai_planning import PlanApplyRequest, PlanApplyResponse
from app.services.task_weight_service import calculate_task_weight_score
from app.services.ai_planning_dependency_service import validate_task_dependencies


def apply_ai_project_plan_atomically(
    db: Session,
    plan_id: uuid.UUID,
    apply_req: PlanApplyRequest,
    current_user: User,
) -> PlanApplyResponse:
    """
    Atomically reviews and converts an AI Project Plan draft into real production Project, Task, and TaskSkill records.
    Runs inside a strict single transaction. If any validation or database error occurs, the entire transaction rolls back.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == plan_id)
    ).scalar_one_or_none()

    if not plan:
        raise ValueError(f"AI Project Plan with ID {plan_id} not found.")

    if plan.status == AIPlanStatus.APPLIED:
        raise ValueError("This AI Project Plan has already been applied to production.")

    # Filter active tasks (excluding EXCLUDED)
    active_plan_tasks = [t for t in plan.tasks if t.status != AIPlanTaskStatus.EXCLUDED]
    if not active_plan_tasks:
        raise ValueError("Cannot apply a plan with zero active tasks. Include at least one approved task.")

    # 1. Dependency validation check
    tasks_dict_list = [
        {
            "id": str(t.id),
            "title": t.title,
            "dependencies": t.dependencies or [],
        }
        for t in active_plan_tasks
    ]
    dep_validation = validate_task_dependencies(tasks_dict_list)
    if not dep_validation["is_valid"]:
        err_msg = "; ".join(dep_validation["errors"])
        raise ValueError(f"Cannot apply plan due to dependency errors: {err_msg}")

    # Start atomic block
    try:
        # 2. Resolve Production Project
        if apply_req.create_new_project or not apply_req.project_id:
            project = Project(
                name=plan.project_name,
                description=plan.project_description,
                status="ACTIVE",
                created_by=current_user.id,
            )
            db.add(project)
            db.flush()
        else:
            project = db.execute(
                select(Project).where(Project.id == apply_req.project_id)
            ).scalar_one_or_none()
            if not project:
                raise ValueError(f"Target production project ID {apply_req.project_id} not found.")

        # 3. Skill Resolution Mapping
        resolution_map = {res.skill_name.lower(): res for res in (apply_req.skill_resolutions or [])}

        def resolve_skill_id(skill_name: str) -> uuid.UUID | None:
            sk_name_lower = skill_name.lower()
            res_item = resolution_map.get(sk_name_lower)

            if res_item:
                if res_item.action == "REMOVE":
                    return None
                if res_item.action == "MAP_EXISTING" and res_item.mapped_existing_skill_id:
                    return res_item.mapped_existing_skill_id

            # Check DB for existing skill by exact name case-insensitive
            existing_skill = db.execute(
                select(Skill).where(Skill.name.ilike(skill_name))
            ).scalars().first()

            if existing_skill:
                return existing_skill.id

            # If action is CREATE_NEW or default auto-creation for unmapped skills
            new_skill = Skill(
                name=skill_name,
                category="AI Generated",
            )
            db.add(new_skill)
            db.flush()
            return new_skill.id

        # 4. Create Production Tasks & TaskSkills
        created_task_ids: List[uuid.UUID] = []

        for p_task in active_plan_tasks:
            real_task = Task(
                title=p_task.title,
                description=p_task.description or f"Module: {p_task.module or 'Core'}",
                project_id=project.id,
                team_id=apply_req.team_id,
                priority=p_task.priority,
                complexity=p_task.complexity,
                estimated_hours=Decimal(str(p_task.estimated_hours)),
                status=TaskStatus.TODO,
                created_by=current_user.id,
            )
            db.add(real_task)
            db.flush()
            created_task_ids.append(real_task.id)

            # Link required skills
            for req in (p_task.required_skills or []):
                if isinstance(req, str):
                    sk_name = req
                    sk_level = 50.0
                elif isinstance(req, dict):
                    sk_name = req.get("skill_name") or req.get("name")
                    sk_level = float(req.get("required_level", 50.0))
                else:
                    sk_name = str(req)
                    sk_level = 50.0

                if sk_name:
                    sk_id = resolve_skill_id(sk_name)
                    if sk_id:
                        task_skill = TaskSkill(
                            task_id=real_task.id,
                            skill_id=sk_id,
                            required_level=Decimal(str(sk_level)),
                        )
                        db.add(task_skill)

            # Calculate and persist automatic Task Weight
            weight_score = calculate_task_weight_score(real_task)
            real_task.task_weight_score = Decimal(str(weight_score))

        # 5. Update Plan status to APPLIED
        plan.status = AIPlanStatus.APPLIED
        plan.applied_project_id = project.id

        db.commit()
        db.refresh(plan)

        return PlanApplyResponse(
            plan_id=plan.id,
            project_id=project.id,
            project_name=project.name,
            created_tasks_count=len(created_task_ids),
            created_task_ids=created_task_ids,
            applied_at=plan.updated_at,
        )

    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to apply AI project plan atomically: {str(e)}")
