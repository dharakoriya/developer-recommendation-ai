import uuid
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.ai_planning import AIProjectPlan, AIProjectPlanTask
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.skill import Skill
from app.models.user import User
from app.models.enums import AvailabilityStatus, AIPlanTaskStatus


def analyze_team_capability_for_plan(
    db: Session, plan_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Analyzes proposed plan tasks against organization/team developers, skills, and workload records.
    Returns task capability classifications, missing skills, and resource bottleneck warnings.
    """
    plan = db.execute(
        select(AIProjectPlan).where(AIProjectPlan.id == plan_id)
    ).scalar_one_or_none()

    if not plan:
        raise ValueError(f"AI Project Plan with ID {plan_id} not found.")

    # Get active tasks (excluding EXCLUDED)
    plan_tasks = [t for t in plan.tasks if t.status != AIPlanTaskStatus.EXCLUDED]

    # Fetch all active developers in organization with skills and latest workloads
    dev_profiles = db.execute(
        select(DeveloperProfile)
    ).scalars().all()

    # Pre-build developer skill map & workload map
    # dev_id -> { "user_name": str, "availability": str, "workload": float, "skills": { skill_name_lower: proficiency } }
    dev_data_map = {}
    skill_to_dev_ids: Dict[str, List[uuid.UUID]] = {}

    for dev in dev_profiles:
        dev_user = db.scalar(select(User).where(User.id == dev.user_id))
        user_name = dev_user.name if dev_user else f"Dev {str(dev.id)[:6]}"

        latest_wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == dev.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        workload_score = float(latest_wl.workload_score) if latest_wl else 0.0

        dev_skills_db = db.execute(
            select(DeveloperSkill, Skill)
            .join(Skill, DeveloperSkill.skill_id == Skill.id)
            .where(DeveloperSkill.developer_id == dev.id)
        ).all()

        skills_dict = {}
        for ds, sk in dev_skills_db:
            sk_name_lower = sk.name.lower()
            skills_dict[sk_name_lower] = float(ds.proficiency_level)

            if sk_name_lower not in skill_to_dev_ids:
                skill_to_dev_ids[sk_name_lower] = []
            skill_to_dev_ids[sk_name_lower].append(dev.id)

        dev_data_map[dev.id] = {
            "id": str(dev.id),
            "name": user_name,
            "availability": dev.availability_status.value if dev.availability_status else "AVAILABLE",
            "workload": workload_score,
            "skills": skills_dict,
        }

    # Track missing skills and skill task counts for bottleneck detection
    all_required_skill_names: Set[str] = set()
    missing_skill_names: Set[str] = set()
    skill_task_counts: Dict[str, int] = {}

    task_analyses: List[Dict[str, Any]] = []
    well_supported_count = 0
    capacity_risk_count = 0
    skill_gap_count = 0

    for task in plan_tasks:
        req_skills = task.required_skills or []
        task_status_class = "WELL_SUPPORTED"
        task_matching_devs = []
        task_reasons = []

        if not req_skills:
            # General task without specific skill requirements
            well_supported_count += 1
            task_analyses.append({
                "task_id": task.id,
                "task_title": task.title,
                "module": task.module,
                "status_classification": "WELL_SUPPORTED",
                "required_skills": [],
                "matching_developers": [],
                "reason": "General task; standard developer capacity available.",
            })
            continue

        has_missing_skill_for_task = False
        has_high_workload_match = False
        has_healthy_match = False

        for req in req_skills:
            if isinstance(req, str):
                sk_name = req
                sk_level = 50.0
            elif isinstance(req, dict):
                sk_name = req.get("skill_name") or req.get("name") or "Unknown"
                sk_level = float(req.get("required_level", 50))
            else:
                sk_name = str(req)
                sk_level = 50.0
            sk_name_lower = sk_name.lower()

            all_required_skill_names.add(sk_name)
            skill_task_counts[sk_name] = skill_task_counts.get(sk_name, 0) + 1

            matching_dev_ids = skill_to_dev_ids.get(sk_name_lower, [])

            if not matching_dev_ids:
                has_missing_skill_for_task = True
                missing_skill_names.add(sk_name)
                task_reasons.append(f"Missing required skill: '{sk_name}' (No developers in org possess this skill).")
            else:
                for d_id in matching_dev_ids:
                    d_info = dev_data_map[d_id]
                    d_level = d_info["skills"].get(sk_name_lower, 0.0)

                    if d_level >= (sk_level - 15.0):
                        task_matching_devs.append({
                            "developer_id": d_info["id"],
                            "name": d_info["name"],
                            "matched_skill": sk_name,
                            "skill_level": d_level,
                            "workload_score": d_info["workload"],
                            "availability": d_info["availability"],
                        })

                        if d_info["workload"] > 70.0 or d_info["availability"] == "UNAVAILABLE":
                            has_high_workload_match = True
                        else:
                            has_healthy_match = True

        if has_missing_skill_for_task:
            task_status_class = "SKILL_GAP"
            skill_gap_count += 1
            reason_str = "; ".join(task_reasons)
        elif not has_healthy_match and has_high_workload_match:
            task_status_class = "CAPACITY_RISK"
            capacity_risk_count += 1
            reason_str = "Matching developers possess required skills, but currently have high workload (>70%) or limited capacity."
        else:
            task_status_class = "WELL_SUPPORTED"
            well_supported_count += 1
            reason_str = f"Found {len(task_matching_devs)} suitable developer(s) with matching skills & healthy capacity."

        # Deduplicate matching devs per task
        unique_devs = []
        seen_ids = set()
        for d in task_matching_devs:
            if d["developer_id"] not in seen_ids:
                seen_ids.add(d["developer_id"])
                unique_devs.append(d)

        task_analyses.append({
            "task_id": task.id,
            "task_title": task.title,
            "module": task.module,
            "status_classification": task_status_class,
            "required_skills": req_skills,
            "matching_developers": unique_devs,
            "reason": reason_str,
        })

    # Resource Bottlenecks Analysis
    resource_bottlenecks = []
    for sk_name, task_cnt in skill_task_counts.items():
        sk_name_lower = sk_name.lower()
        dev_cnt = len(skill_to_dev_ids.get(sk_name_lower, []))

        if dev_cnt > 0 and task_cnt >= 3 and (task_cnt / dev_cnt) >= 3.0:
            resource_bottlenecks.append({
                "skill_name": sk_name,
                "expert_developer_count": dev_cnt,
                "demanded_tasks_count": task_cnt,
                "warning_message": f"Resource Bottleneck Warning: {dev_cnt} '{sk_name}' expert(s) required for {task_cnt} tasks. High risk of workload bottleneck.",
            })

    return {
        "plan_id": plan.id,
        "total_generated_tasks": len(plan_tasks),
        "well_supported_count": well_supported_count,
        "capacity_risk_count": capacity_risk_count,
        "skill_gap_count": skill_gap_count,
        "missing_skills": sorted(list(missing_skill_names)),
        "resource_bottlenecks": resource_bottlenecks,
        "task_analyses": task_analyses,
    }
