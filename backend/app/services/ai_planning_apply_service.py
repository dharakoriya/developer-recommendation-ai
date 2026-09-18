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
        resolution_map = {
            res.skill_name.strip().lower(): res
            for res in (apply_req.skill_resolutions or [])
            if res.skill_name and res.skill_name.strip()
        }

        # Cache resolved skill IDs by normalized name to prevent duplicate DB lookups or inserts
        resolved_skills_cache: Dict[str, uuid.UUID | None] = {}

        def resolve_skill_id(skill_name: str) -> uuid.UUID | None:
            if not skill_name or not str(skill_name).strip():
                return None
            sk_name_clean = str(skill_name).strip()
            sk_name_lower = sk_name_clean.lower()

            if sk_name_lower in resolved_skills_cache:
                return resolved_skills_cache[sk_name_lower]

            res_item = resolution_map.get(sk_name_lower)

            if res_item:
                if res_item.action == "REMOVE":
                    resolved_skills_cache[sk_name_lower] = None
                    return None
                if res_item.action == "MAP_EXISTING" and res_item.mapped_existing_skill_id:
                    resolved_skills_cache[sk_name_lower] = res_item.mapped_existing_skill_id
                    return res_item.mapped_existing_skill_id

            # Check DB for existing skill by exact name case-insensitive
            existing_skill = db.execute(
                select(Skill).where(Skill.name.ilike(sk_name_clean))
            ).scalars().first()

            if existing_skill:
                resolved_skills_cache[sk_name_lower] = existing_skill.id
                return existing_skill.id

            # If action is CREATE_NEW or default auto-creation for unmapped skills
            new_skill = Skill(
                name=sk_name_clean,
                category="AI Generated",
            )
            db.add(new_skill)
            db.flush()
            resolved_skills_cache[sk_name_lower] = new_skill.id
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

            # Link required skills (deduplicated by skill_id per task to obey uq_task_skill)
            task_skills_map: Dict[uuid.UUID, Decimal] = {}
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

                if sk_name and str(sk_name).strip():
                    sk_id = resolve_skill_id(str(sk_name).strip())
                    if sk_id:
                        req_level_dec = Decimal(str(sk_level))
                        if sk_id in task_skills_map:
                            if req_level_dec > task_skills_map[sk_id]:
                                task_skills_map[sk_id] = req_level_dec
                        else:
                            task_skills_map[sk_id] = req_level_dec

            for sk_id, req_level in task_skills_map.items():
                task_skill = TaskSkill(
                    task_id=real_task.id,
                    skill_id=sk_id,
                    required_level=req_level,
                )
                db.add(task_skill)
                real_task.task_skills.append(task_skill)

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
