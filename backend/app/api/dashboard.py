import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.developer import DeveloperProfile, WorkloadRecord
from app.models.task import Task, Assignment
from app.models.recommendation import Recommendation
from app.models.recommendation_audit import RecommendationAudit, RecommendationFeedback
from app.models.enums import TaskStatus, AssignmentStatus, FeedbackDecision
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/summary", summary="Get operational dashboard statistics")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves operational dashboard metrics: total projects, active projects, total developers,
    active tasks, unassigned tasks, high workload developers, recent recommendations, and recent assignments.
    """
    total_projects = db.scalar(select(func.count(Project.id))) or 0
    active_projects = db.scalar(select(func.count(Project.id)).where(Project.status == "ACTIVE")) or 0

    total_developers = db.scalar(select(func.count(DeveloperProfile.id))) or 0
    available_developers = db.scalar(select(func.count(DeveloperProfile.id)).where(DeveloperProfile.availability_status == "AVAILABLE")) or 0

    active_tasks = db.scalar(select(func.count(Task.id)).where(Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]))) or 0
    completed_tasks = db.scalar(select(func.count(Task.id)).where(Task.status == TaskStatus.COMPLETED)) or 0

    # Unassigned tasks: tasks with TODO/IN_PROGRESS status that have no ACTIVE assignment
    active_assignment_task_ids = select(Assignment.task_id).where(Assignment.status == AssignmentStatus.ACTIVE)
    unassigned_tasks = db.scalar(
        select(func.count(Task.id)).where(
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS]),
            Task.id.not_in(active_assignment_task_ids)
        )
    ) or 0

    # High workload developers (workload_score > 75)
    dev_profiles = db.execute(select(DeveloperProfile)).scalars().all()
    high_workload_count = 0
    for dev in dev_profiles:
        latest_wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == dev.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        wl_score = float(latest_wl.workload_score) if latest_wl else 0.0
        if wl_score >= 75.0:
            high_workload_count += 1

    # Recent recommendations (top 5)
    recent_recs_db = db.execute(
        select(Recommendation)
        .order_by(desc(Recommendation.created_at))
        .limit(5)
    ).scalars().all()

    recent_recommendations = []
    for r in recent_recs_db:
        t = db.scalar(select(Task).where(Task.id == r.task_id))
        d_prof = db.scalar(select(DeveloperProfile).where(DeveloperProfile.id == r.developer_id))
        d_user = db.scalar(select(User).where(User.id == d_prof.user_id)) if d_prof else None
        recent_recommendations.append({
            "id": str(r.id),
            "task_id": str(r.task_id),
            "task_title": t.title if t else "Task",
            "developer_id": str(r.developer_id),
            "developer_name": d_user.name if d_user else "Developer",
            "rank": r.rank,
            "recommendation_score": float(r.score),
            "model_version": r.model_version,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Recent assignments (top 5)
    recent_assign_db = db.execute(
        select(Assignment)
        .order_by(desc(Assignment.assigned_at))
        .limit(5)
    ).scalars().all()

    recent_assignments = []
    for a in recent_assign_db:
        t = db.scalar(select(Task).where(Task.id == a.task_id))
        d_prof = db.scalar(select(DeveloperProfile).where(DeveloperProfile.id == a.developer_id))
        d_user = db.scalar(select(User).where(User.id == d_prof.user_id)) if d_prof else None
        recent_assignments.append({
            "id": str(a.id),
            "task_id": str(a.task_id),
            "task_title": t.title if t else "Task",
            "developer_id": str(a.developer_id),
            "developer_name": d_user.name if d_user else "Developer",
            "status": a.status.value,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })

    # Additional DEVELOPER role personal metrics
    developer_profile_id = None
    my_tasks = []
    my_workload_score = 0.0
    my_availability = "AVAILABLE"
    my_skills = []

    dev_profile_obj = db.scalar(select(DeveloperProfile).where(DeveloperProfile.user_id == current_user.id))
    if dev_profile_obj:
        developer_profile_id = str(dev_profile_obj.id)
        my_availability = str(dev_profile_obj.availability_status.value)
        
        # Get active assignments for developer
        dev_assignments = db.execute(
            select(Assignment)
            .where(
                Assignment.developer_id == dev_profile_obj.id,
                Assignment.status == AssignmentStatus.ACTIVE,
            )
        ).scalars().all()
        
        for a in dev_assignments:
            task_obj = db.scalar(select(Task).where(Task.id == a.task_id))
            if task_obj:
                my_tasks.append({
                    "id": str(task_obj.id),
                    "title": task_obj.title,
                    "project_name": task_obj.project.name if task_obj.project else "Project",
                    "priority": task_obj.priority.value,
                    "complexity": task_obj.complexity.value,
                    "estimated_hours": float(task_obj.estimated_hours),
                    "status": task_obj.status.value,
                })

        # Latest workload score
        latest_wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == dev_profile_obj.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        if latest_wl:
            my_workload_score = float(latest_wl.workload_score)

        # Developer skills
        from app.models.developer import DeveloperSkill
        from app.models.skill import Skill
        skills_db = db.execute(
            select(DeveloperSkill, Skill)
            .join(Skill, DeveloperSkill.skill_id == Skill.id)
            .where(DeveloperSkill.developer_id == dev_profile_obj.id)
        ).all()
        for ds, sk in skills_db:
            my_skills.append({
                "skill_name": sk.name,
                "proficiency_level": float(ds.proficiency_level),
            })

        # Performance, Streak, Achievements, Incentives
        from app.services.performance_service import calculate_developer_performance_metrics, evaluate_and_grant_developer_achievements
        from app.models.performance import DeveloperStreak, DeveloperAchievement, DeveloperIncentiveLedger

        perf_metrics = calculate_developer_performance_metrics(db, dev_profile_obj.id)
        
        streak_obj = db.scalar(select(DeveloperStreak).where(DeveloperStreak.developer_id == dev_profile_obj.id))
        achievements_obj = db.scalars(select(DeveloperAchievement).where(DeveloperAchievement.developer_id == dev_profile_obj.id)).all()
        incentive_pts = db.scalar(
            select(func.coalesce(func.sum(DeveloperIncentiveLedger.total_points), 0)).where(
                DeveloperIncentiveLedger.developer_id == dev_profile_obj.id
            )
        ) or 0.0

        my_performance = {
          "performance_score": perf_metrics.get("performance_score", 85.0),
          "completion_rate": perf_metrics.get("completion_rate", 100.0),
          "on_time_rate": perf_metrics.get("on_time_rate", 100.0),
          "weighted_productivity": perf_metrics.get("weighted_productivity", 50.0),
        }
        my_streak = {
          "current_streak": streak_obj.current_streak if streak_obj else 0,
          "longest_streak": streak_obj.longest_streak if streak_obj else 0,
        }
        my_achievements = [
          {"key": a.achievement_key, "title": a.title, "description": a.description, "icon": a.icon}
          for a in achievements_obj
        ]
        my_incentives = float(incentive_pts)
    else:
        my_performance = {"performance_score": 0, "completion_rate": 0, "on_time_rate": 0, "weighted_productivity": 0}
        my_streak = {"current_streak": 0, "longest_streak": 0}
        my_achievements = []
        my_incentives = 0.0

    return {
        "user_role": current_user.role.value,
        "developer_profile_id": developer_profile_id,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_developers": total_developers,
        "available_developers": available_developers,
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks,
        "unassigned_tasks": unassigned_tasks,
        "high_workload_developers": high_workload_count,
        "recent_recommendations": recent_recommendations,
        "recent_assignments": recent_assignments,
        "my_tasks": my_tasks,
        "my_workload_score": my_workload_score,
        "my_availability": my_availability,
        "my_skills": my_skills,
        "my_performance": my_performance,
        "my_streak": my_streak,
        "my_achievements": my_achievements,
        "my_incentives": my_incentives,
    }


@router.get("/workload", summary="Get workload chart data")
def get_dashboard_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns workload distribution metrics across developers.
    """
    dev_profiles = db.execute(select(DeveloperProfile)).scalars().all()
    
    healthy = 0    # < 50
    moderate = 0   # 50 - 75
    high = 0       # 75 - 100
    overloaded = 0 # > 100

    developer_workloads = []
    for dev in dev_profiles:
        user_obj = db.scalar(select(User).where(User.id == dev.user_id))
        latest_wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == dev.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        score = float(latest_wl.workload_score) if latest_wl else 0.0
        from app.services.workload_service import classify_workload_status
        status_str = classify_workload_status(Decimal(str(score))) if latest_wl else "HEALTHY"

        if score < 50.0:
            healthy += 1
        elif score < 75.0:
            moderate += 1
        elif score <= 100.0:
            high += 1
        else:
            overloaded += 1

        developer_workloads.append({
            "developer_id": str(dev.id),
            "name": user_obj.name if user_obj else "Developer",
            "workload_score": score,
            "status": status_str,
        })

    return {
        "healthy_count": healthy,
        "moderate_count": moderate,
        "high_count": high,
        "overloaded_count": overloaded,
        "developer_workloads": developer_workloads,
    }


@router.get("/recommendations", summary="Get recommendation statistics")
def get_dashboard_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns high-level recommendation activity metrics.
    """
    total_generated = db.scalar(select(func.count(RecommendationAudit.id))) or 0
    accepted = db.scalar(select(func.count(RecommendationFeedback.id)).where(RecommendationFeedback.decision == FeedbackDecision.ACCEPTED)) or 0
    rejected = db.scalar(select(func.count(RecommendationFeedback.id)).where(RecommendationFeedback.decision == FeedbackDecision.REJECTED)) or 0

    return {
        "active_model_version": "baseline-v1",
        "active_model_name": "deterministic_baseline",
        "total_recommendations_generated": total_generated,
        "accepted_count": accepted,
        "rejected_count": rejected,
        "acceptance_rate": round((accepted / max(1, accepted + rejected)) * 100.0, 2) if (accepted + rejected) > 0 else 0.0,
    }
