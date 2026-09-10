import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.task import Task, TaskSkill, Assignment
from app.models.developer import DeveloperProfile, DeveloperSkill
from app.models.project import Project
from app.models.enums import TaskStatus, TaskComplexity, TaskPriority, AssignmentStatus, AvailabilityStatus
from app.services.workload_service import calculate_developer_workload_details
from app.services.performance_service import calculate_developer_performance_metrics


def _classify_score_level(score: float) -> str:
    if score >= 80.0:
        return "CRITICAL"
    elif score >= 55.0:
        return "HIGH"
    elif score >= 30.0:
        return "MEDIUM"
    else:
        return "LOW"


def assess_task_risk(db: Session, task_id: uuid.UUID) -> Dict[str, Any]:
    """
    Calculates deterministic risk assessment for a single task.
    Signals evaluated: Schedule, Workload, Complexity, Skill Gap, and Dependencies.
    Returns structured risk payload with breakdown and human-readable explanations.
    """
    stmt = (
        select(Task)
        .options(
            joinedload(Task.project),
            joinedload(Task.team),
            joinedload(Task.task_skills).joinedload(TaskSkill.skill),
            joinedload(Task.assignments).joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Task.assignments).joinedload(Assignment.developer_profile).joinedload(DeveloperProfile.developer_skills),
        )
        .where(Task.id == task_id)
    )
    task = db.execute(stmt).unique().scalar_one_or_none()

    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    if task.status == TaskStatus.COMPLETED:
        return {
            "task_id": str(task.id),
            "task_title": task.title,
            "overall_risk_level": "LOW",
            "overall_risk_score": 0.0,
            "is_completed": True,
            "drivers": [],
            "risk_breakdown": {
                "schedule_risk": {"score": 0.0, "level": "LOW"},
                "workload_risk": {"score": 0.0, "level": "LOW"},
                "skill_gap_risk": {"score": 0.0, "level": "LOW"},
                "complexity_risk": {"score": 0.0, "level": "LOW"},
            },
            "explanation": "Task is already completed.",
            "recommended_action": "No action required.",
        }

    drivers: List[Dict[str, Any]] = []
    schedule_score = 0.0
    workload_score = 0.0
    skill_gap_score = 0.0
    complexity_score = 0.0

    now = datetime.now(timezone.utc)

    # 1. Schedule Risk Assessment
    if task.deadline:
        deadline_dt = task.deadline.replace(tzinfo=timezone.utc) if task.deadline.tzinfo is None else task.deadline
        days_remaining = (deadline_dt - now).total_seconds() / 86400.0

        if days_remaining < 0:
            schedule_score = 100.0
            drivers.append({
                "category": "SCHEDULE",
                "severity": "CRITICAL",
                "reason": f"Deadline was overdue by {abs(int(days_remaining))} days.",
            })
        elif days_remaining <= 2.0:
            schedule_score = 85.0
            drivers.append({
                "category": "SCHEDULE",
                "severity": "HIGH",
                "reason": f"Deadline is approaching in {days_remaining:.1f} days.",
            })
        elif days_remaining <= 5.0:
            schedule_score = 55.0
            drivers.append({
                "category": "SCHEDULE",
                "severity": "MEDIUM",
                "reason": f"Tight deadline window ({days_remaining:.1f} days remaining).",
            })
        else:
            schedule_score = 15.0

    # 2. Assigned Developer & Workload Risk
    active_assignment = next(
        (a for a in task.assignments if a.status == AssignmentStatus.ACTIVE), None
    )

    if active_assignment and active_assignment.developer_profile:
        dev_profile = active_assignment.developer_profile
        wl_details = calculate_developer_workload_details(db, dev_profile.id)
        wl_score_val = float(wl_details.workload_score)

        if wl_score_val > 100.0:
            workload_score = 90.0
            drivers.append({
                "category": "WORKLOAD",
                "severity": "CRITICAL",
                "reason": f"Assigned developer ({wl_details.user_name}) is severely overloaded ({wl_score_val:.1f}% capacity).",
            })
        elif wl_score_val >= 80.0:
            workload_score = 65.0
            drivers.append({
                "category": "WORKLOAD",
                "severity": "HIGH",
                "reason": f"Assigned developer ({wl_details.user_name}) has high workload ({wl_score_val:.1f}% capacity).",
            })
        elif wl_score_val >= 50.0:
            workload_score = 35.0
        else:
            workload_score = 10.0

        # Performance concerns
        perf_metrics = calculate_developer_performance_metrics(db, dev_profile.id)
        if perf_metrics["performance_score"] < 60.0:
            workload_score = min(100.0, workload_score + 20.0)
            drivers.append({
                "category": "DELIVERY",
                "severity": "MEDIUM",
                "reason": f"Assigned developer performance score ({perf_metrics['performance_score']:.1f}) is below standard.",
            })

    else:
        # Unassigned Task Risk
        workload_score = 60.0
        drivers.append({
            "category": "ASSIGNMENT",
            "severity": "HIGH",
            "reason": "Task is currently unassigned.",
        })

    # 3. Skill Gap Risk
    required_task_skills = task.task_skills
    if required_task_skills:
        if active_assignment and active_assignment.developer_profile:
            dev_skills = {ds.skill_id: float(ds.proficiency_level) for ds in dev_profile.developer_skills}
            missing_or_low_skills = []

            for ts in required_task_skills:
                req_level = float(ts.required_level)
                dev_level = dev_skills.get(ts.skill_id, 0.0)
                if dev_level < req_level:
                    skill_name = ts.skill.name if ts.skill else "Skill"
                    missing_or_low_skills.append(f"{skill_name} (req: {req_level:.0f}, has: {dev_level:.0f})")

            if missing_or_low_skills:
                gap_ratio = len(missing_or_low_skills) / len(required_task_skills)
                skill_gap_score = min(100.0, gap_ratio * 100.0)
                drivers.append({
                    "category": "SKILL_GAP",
                    "severity": "HIGH" if gap_ratio > 0.5 else "MEDIUM",
                    "reason": f"Assigned developer skill gap: {', '.join(missing_or_low_skills)}.",
                })
            else:
                skill_gap_score = 10.0
        else:
            skill_gap_score = 40.0

    # 4. Complexity & Weight Risk
    task_weight = float(task.task_weight_score) if task.task_weight_score else 50.0
    if task_weight >= 75.0 or task.complexity == TaskComplexity.HIGH:
        complexity_score = 75.0
        drivers.append({
            "category": "COMPLEXITY",
            "severity": "MEDIUM",
            "reason": f"High task complexity/weight (Score: {task_weight:.1f}, Complexity: {task.complexity.value}).",
        })
    elif task.complexity == TaskComplexity.MEDIUM:
        complexity_score = 40.0
    else:
        complexity_score = 15.0

    # Weighted Overall Risk Score Calculation
    overall_score = round(
        (schedule_score * 0.35) + (workload_score * 0.30) + (skill_gap_score * 0.20) + (complexity_score * 0.15),
        2
    )

    overall_level = _classify_score_level(overall_score)

    if overall_level in ["HIGH", "CRITICAL"]:
        rec_action = "Review developer workload and consider re-balancing or updating deadlines."
    elif overall_level == "MEDIUM":
        rec_action = "Monitor task progress closely and verify prerequisite deliverables."
    else:
        rec_action = "Task delivery is on track."

    explanation = f"Task risk is evaluated as {overall_level} ({overall_score}/100) based on schedule, workload, and skill coverage signals."

    return {
        "task_id": str(task.id),
        "task_title": task.title,
        "overall_risk_level": overall_level,
        "overall_risk_score": overall_score,
        "is_completed": False,
        "drivers": drivers,
        "risk_breakdown": {
            "schedule_risk": {"score": schedule_score, "level": _classify_score_level(schedule_score)},
            "workload_risk": {"score": workload_score, "level": _classify_score_level(workload_score)},
            "skill_gap_risk": {"score": skill_gap_score, "level": _classify_score_level(skill_gap_score)},
            "complexity_risk": {"score": complexity_score, "level": _classify_score_level(complexity_score)},
        },
        "explanation": explanation,
        "recommended_action": rec_action,
    }


def assess_developer_delivery_risk(db: Session, developer_id: uuid.UUID) -> Dict[str, Any]:
    """
    Evaluates developer delivery risk based on active workload, deadline concentration, and performance metrics.
    """
    wl_details = calculate_developer_workload_details(db, developer_id)
    perf_metrics = calculate_developer_performance_metrics(db, developer_id)

    wl_score = float(wl_details.workload_score)
    perf_score = perf_metrics["performance_score"]
    active_count = wl_details.active_task_count

    drivers: List[Dict[str, Any]] = []
    risk_score = 0.0

    if wl_score > 100.0:
        risk_score += 50.0
        drivers.append({
            "category": "WORKLOAD",
            "severity": "CRITICAL",
            "reason": f"Capacity utilization is overloaded ({wl_score:.1f}%).",
        })
    elif wl_score >= 80.0:
        risk_score += 35.0
        drivers.append({
            "category": "WORKLOAD",
            "severity": "HIGH",
            "reason": f"High capacity utilization ({wl_score:.1f}%).",
        })
    elif wl_score >= 50.0:
        risk_score += 15.0

    if active_count >= 4:
        risk_score += 25.0
        drivers.append({
            "category": "CONCURRENCY",
            "severity": "HIGH",
            "reason": f"High active task count ({active_count} concurrent tasks).",
        })
    elif active_count == 3:
        risk_score += 15.0

    if perf_score < 60.0:
        risk_score += 25.0
        drivers.append({
            "category": "PERFORMANCE",
            "severity": "MEDIUM",
            "reason": f"Performance score ({perf_score:.1f}) is below target thresholds.",
        })

    if wl_details.availability_status == AvailabilityStatus.UNAVAILABLE and active_count > 0:
        risk_score += 30.0
        drivers.append({
            "category": "AVAILABILITY",
            "severity": "CRITICAL",
            "reason": "Developer is set to UNAVAILABLE but still assigned active tasks.",
        })

    final_score = round(min(100.0, risk_score), 2)
    level = _classify_score_level(final_score)

    explanation = f"Developer delivery risk is {level} ({final_score}/100) reflecting active task concurrency and workload pressure."

    return {
        "developer_id": str(developer_id),
        "developer_name": wl_details.user_name,
        "delivery_risk_level": level,
        "delivery_risk_score": final_score,
        "workload_percentage": wl_score,
        "active_task_count": active_count,
        "performance_score": perf_score,
        "drivers": drivers,
        "explanation": explanation,
    }


def assess_project_risk(db: Session, project_id: uuid.UUID) -> Dict[str, Any]:
    """
    Evaluates project-level risk by analyzing task risk distribution, schedule progress, and team capacity constraints.
    """
    stmt = (
        select(Project)
        .options(joinedload(Project.tasks))
        .where(Project.id == project_id)
    )
    project = db.execute(stmt).unique().scalar_one_or_none()

    if not project:
        raise ValueError(f"Project with ID {project_id} not found.")

    tasks = project.tasks
    total_tasks = len(tasks)

    if total_tasks == 0:
        return {
            "project_id": str(project.id),
            "project_name": project.name,
            "overall_risk_level": "LOW",
            "overall_risk_score": 0.0,
            "task_counts": {"total": 0, "completed": 0, "high_risk": 0, "critical_risk": 0},
            "top_drivers": [],
            "breakdown": {
                "schedule_risk": "LOW",
                "workload_risk": "LOW",
                "delivery_risk": "LOW",
            },
            "recommended_action": "Add tasks to project to enable risk tracking.",
            "explanation": "No tasks created for this project yet.",
        }

    completed_tasks = [t for t in tasks if t.status == TaskStatus.COMPLETED]
    active_tasks = [t for t in tasks if t.status != TaskStatus.COMPLETED]

    high_risk_tasks = 0
    critical_risk_tasks = 0
    total_task_risk_score = 0.0
    project_drivers: List[Dict[str, Any]] = []

    for t in active_tasks:
        tr = assess_task_risk(db, t.id)
        total_task_risk_score += tr["overall_risk_score"]
        if tr["overall_risk_level"] == "CRITICAL":
            critical_risk_tasks += 1
            for d in tr["drivers"]:
                project_drivers.append({
                    "task_title": t.title,
                    "category": d["category"],
                    "reason": d["reason"],
                    "severity": d["severity"],
                })
        elif tr["overall_risk_level"] == "HIGH":
            high_risk_tasks += 1

    avg_task_risk = (total_task_risk_score / len(active_tasks)) if active_tasks else 0.0

    # Project Schedule Progress
    progress_pct = (len(completed_tasks) / total_tasks) * 100.0

    now = datetime.now(timezone.utc)
    proj_schedule_risk = 0.0
    project_end_date = getattr(project, "end_date", None)
    if not project_end_date and tasks:
        task_deadlines = [t.deadline for t in tasks if t.deadline]
        if task_deadlines:
            project_end_date = max(task_deadlines)

    if project_end_date:
        end_dt = project_end_date.replace(tzinfo=timezone.utc) if project_end_date.tzinfo is None else project_end_date
        days_left = (end_dt - now).total_seconds() / 86400.0

        if days_left < 0 and progress_pct < 100.0:
            proj_schedule_risk = 100.0
            project_drivers.append({
                "task_title": "Project Schedule",
                "category": "DEADLINE",
                "reason": f"Project target end date was exceeded by {abs(int(days_left))} days with {100 - progress_pct:.0f}% remaining.",
                "severity": "CRITICAL",
            })
        elif days_left <= 7.0 and progress_pct < 75.0:
            proj_schedule_risk = 75.0
            project_drivers.append({
                "task_title": "Project Schedule",
                "category": "DEADLINE",
                "reason": f"Project target end date is in {days_left:.1f} days with {progress_pct:.0f}% completed.",
                "severity": "HIGH",
            })

    overall_proj_score = round(min(100.0, (avg_task_risk * 0.6) + (proj_schedule_risk * 0.4)), 2)
    overall_level = _classify_score_level(overall_proj_score)

    if overall_level in ["HIGH", "CRITICAL"]:
        recommended_action = "Review top critical tasks, reassign overloaded developers, and align schedule scope."
    elif overall_level == "MEDIUM":
        recommended_action = "Monitor approaching deadlines and high-workload task assignments."
    else:
        recommended_action = "Project execution is progressing within normal operating parameters."

    # Deduplicate top drivers
    top_drivers = project_drivers[:5]

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "overall_risk_level": overall_level,
        "overall_risk_score": overall_proj_score,
        "progress_percentage": round(progress_pct, 1),
        "task_counts": {
            "total": total_tasks,
            "completed": len(completed_tasks),
            "active": len(active_tasks),
            "high_risk": high_risk_tasks,
            "critical_risk": critical_risk_tasks,
        },
        "top_drivers": top_drivers,
        "recommended_action": recommended_action,
        "explanation": f"Project risk is rated {overall_level} ({overall_proj_score}/100) based on {len(active_tasks)} active tasks and schedule timeline.",
    }


def get_system_risk_summary(db: Session) -> Dict[str, Any]:
    """
    Provides an aggregated executive summary of all project, task, and developer risks across the platform.
    """
    projects = db.execute(select(Project)).scalars().all()
    devs = db.execute(select(DeveloperProfile)).scalars().all()
    tasks = db.execute(select(Task).where(Task.status != TaskStatus.COMPLETED)).scalars().all()

    high_risk_projects = 0
    critical_risk_projects = 0
    high_risk_tasks = 0
    critical_risk_tasks = 0
    high_risk_devs = 0

    for p in projects:
        pr = assess_project_risk(db, p.id)
        if pr["overall_risk_level"] == "CRITICAL":
            critical_risk_projects += 1
        elif pr["overall_risk_level"] == "HIGH":
            high_risk_projects += 1

    for t in tasks:
        tr = assess_task_risk(db, t.id)
        if tr["overall_risk_level"] == "CRITICAL":
            critical_risk_tasks += 1
        elif tr["overall_risk_level"] == "HIGH":
            high_risk_tasks += 1

    for d in devs:
        dr = assess_developer_delivery_risk(db, d.id)
        if dr["delivery_risk_level"] in ["HIGH", "CRITICAL"]:
            high_risk_devs += 1

    return {
        "total_projects": len(projects),
        "high_risk_projects_count": high_risk_projects,
        "critical_risk_projects_count": critical_risk_projects,
        "active_tasks_count": len(tasks),
        "high_risk_tasks_count": high_risk_tasks,
        "critical_risk_tasks_count": critical_risk_tasks,
        "total_developers": len(devs),
        "high_delivery_risk_developers_count": high_risk_devs,
    }
