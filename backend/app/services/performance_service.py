import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, delete

from app.models.developer import DeveloperProfile
from app.models.task import Task, Assignment
from app.models.performance import (
    DeveloperStreak,
    DeveloperAchievement,
    DeveloperIncentiveLedger,
    DeveloperPerformanceSnapshot,
)
from app.models.enums import AssignmentStatus, TaskComplexity, TaskStatus
from app.services.task_weight_service import calculate_task_weight_score, update_and_persist_task_weight


ACHIEVEMENT_CATALOG = [
    {
        "key": "STREAK_3_DAYS",
        "category": "consistency",
        "title": "3-Day Completion Streak",
        "description": "Completed qualifying tasks on 3 consecutive days.",
        "icon": "flame",
    },
    {
        "key": "STREAK_7_DAYS",
        "category": "consistency",
        "title": "7-Day Power Streak",
        "description": "Maintained an active completion streak for a full week.",
        "icon": "flame",
    },
    {
        "key": "STREAK_30_DAYS",
        "category": "consistency",
        "title": "30-Day Master Streak",
        "description": "Achieved legendary 30-day consistent task delivery.",
        "icon": "flame",
    },
    {
        "key": "TASKS_1_COMPLETED",
        "category": "productivity",
        "title": "First Milestone Completed",
        "description": "Successfully completed your first assigned task.",
        "icon": "rocket",
    },
    {
        "key": "TASKS_5_COMPLETED",
        "category": "productivity",
        "title": "5 Tasks Delivered",
        "description": "Successfully completed 5 tasks with high quality.",
        "icon": "rocket",
    },
    {
        "key": "TASKS_10_COMPLETED",
        "category": "productivity",
        "title": "10 Tasks Delivered",
        "description": "Reached a milestone of 10 completed tasks.",
        "icon": "rocket",
    },
    {
        "key": "HIGH_COMPLEXITY_MASTER",
        "category": "difficulty",
        "title": "High Complexity Specialist",
        "description": "Completed a high-complexity task (Task Weight >= 75).",
        "icon": "brain",
    },
    {
        "key": "SPEED_DEMON",
        "category": "speed",
        "title": "Ahead of Schedule",
        "description": "Delivered task on-time ahead of estimated effort.",
        "icon": "zap",
    },
]


def calculate_developer_performance_metrics(db: Session, developer_id: uuid.UUID) -> Dict[str, Any]:
    """
    Computes comprehensive developer performance metrics:
    - Completion Rate
    - Weighted Productivity
    - On-Time Completion Rate
    - Composite Performance Score (0..100)
    """
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise ValueError(f"Developer profile with ID {developer_id} not found.")

    assignments_stmt = (
        select(Assignment)
        .options(joinedload(Assignment.task).joinedload(Task.task_skills))
        .where(Assignment.developer_id == developer_id)
    )
    assignments = db.execute(assignments_stmt).unique().scalars().all()

    total_assignments = len(assignments)
    completed_assignments = [a for a in assignments if a.status == AssignmentStatus.COMPLETED]
    completed_count = len(completed_assignments)

    if total_assignments > 0:
        completion_rate = round((completed_count / total_assignments) * 100.0, 2)
    else:
        completion_rate = 100.0

    # Weighted Productivity
    weighted_productivity = 0.0
    on_time_count = 0

    for a in completed_assignments:
        task = a.task
        if task:
            weight = float(task.task_weight_score) if task.task_weight_score is not None else calculate_task_weight_score(task)
            weighted_productivity += weight

            # On-time check
            if a.completed_at and a.assigned_at:
                actual_duration_hrs = (a.completed_at - a.assigned_at).total_seconds() / 3600.0
                est_hrs = float(task.estimated_hours) if task.estimated_hours else 8.0
                if task.deadline:
                    if a.completed_at <= task.deadline:
                        on_time_count += 1
                elif actual_duration_hrs <= (est_hrs * 1.2):
                    on_time_count += 1
            else:
                on_time_count += 1

    if completed_count > 0:
        on_time_rate = round((on_time_count / completed_count) * 100.0, 2)
    else:
        on_time_rate = 100.0

    # Get current streak
    streak_record = db.execute(
        select(DeveloperStreak).where(DeveloperStreak.developer_id == developer_id)
    ).scalar_one_or_none()
    current_streak = streak_record.current_streak if streak_record else 0

    # Calculate Composite Developer Performance Score (0..100)
    # Completion Rate (30%), Weighted Productivity (25%), On-Time (20%), Quality/Skills (15%), Streak (10%)
    if completed_count == 0:
        # Initial baseline if developer has no completed tasks yet
        performance_score = float(dev_profile.performance_score) if dev_profile.performance_score is not None else 75.0
    else:
        # Normalized weighted productivity factor (100 weighted pts ~ 100% capacity)
        productivity_factor = min(100.0, (weighted_productivity / max(1.0, completed_count * 50.0)) * 100.0)
        streak_factor = min(100.0, current_streak * 20.0)
        skill_count = len(dev_profile.developer_skills or [])
        quality_factor = min(100.0, 50.0 + (skill_count * 10.0))

        score = (
            (0.30 * completion_rate)
            + (0.25 * productivity_factor)
            + (0.20 * on_time_rate)
            + (0.15 * quality_factor)
            + (0.10 * streak_factor)
        )
        performance_score = round(min(100.0, max(0.0, score)), 2)

    return {
        "developer_id": developer_id,
        "total_assignments": total_assignments,
        "completed_tasks": completed_count,
        "completion_rate": completion_rate,
        "weighted_productivity": round(weighted_productivity, 2),
        "on_time_rate": on_time_rate,
        "current_streak": current_streak,
        "performance_score": performance_score,
    }


def update_developer_streak_on_task_completion(
    db: Session, developer_id: uuid.UUID, task_weight: float, completion_date: Optional[date] = None
) -> DeveloperStreak:
    """
    Updates developer productivity streak upon completing a qualifying task (Task Weight >= 20.0).
    """
    if completion_date is None:
        completion_date = datetime.now(timezone.utc).date()

    streak = db.execute(
        select(DeveloperStreak).where(DeveloperStreak.developer_id == developer_id)
    ).scalar_one_or_none()

    if not streak:
        streak = DeveloperStreak(
            developer_id=developer_id,
            current_streak=0,
            longest_streak=0,
            last_completion_date=None,
        )
        db.add(streak)
        db.flush()

    # Rule: Streak only increases for qualifying tasks (Task Weight >= 20.0)
    if task_weight < 20.0:
        return streak

    if streak.last_completion_date is None:
        streak.current_streak = 1
        streak.longest_streak = 1
        streak.last_completion_date = completion_date
    else:
        diff_days = (completion_date - streak.last_completion_date).days
        if diff_days == 0:
            # Same calendar day completion: maintain current streak
            pass
        elif diff_days == 1:
            # Next consecutive day completion: increment streak
            streak.current_streak += 1
            streak.last_completion_date = completion_date
        else:
            # Gap > 1 day: reset streak to 1
            streak.current_streak = 1
            streak.last_completion_date = completion_date

        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak

    db.commit()
    db.refresh(streak)
    return streak


def evaluate_and_grant_developer_achievements(
    db: Session, developer_id: uuid.UUID
) -> List[DeveloperAchievement]:
    """
    Evaluates developer metrics and awards non-duplicative achievements.
    """
    metrics = calculate_developer_performance_metrics(db, developer_id)
    streak_rec = db.execute(
        select(DeveloperStreak).where(DeveloperStreak.developer_id == developer_id)
    ).scalar_one_or_none()

    current_streak = streak_rec.current_streak if streak_rec else 0
    completed_count = metrics["completed_tasks"]

    existing_keys = set(
        db.execute(
            select(DeveloperAchievement.achievement_key).where(
                DeveloperAchievement.developer_id == developer_id
            )
        ).scalars().all()
    )

    new_achievements: List[DeveloperAchievement] = []

    for item in ACHIEVEMENT_CATALOG:
        key = item["key"]
        if key in existing_keys:
            continue

        earned = False
        if key == "STREAK_3_DAYS" and current_streak >= 3:
            earned = True
        elif key == "STREAK_7_DAYS" and current_streak >= 7:
            earned = True
        elif key == "STREAK_30_DAYS" and current_streak >= 30:
            earned = True
        elif key == "TASKS_1_COMPLETED" and completed_count >= 1:
            earned = True
        elif key == "TASKS_5_COMPLETED" and completed_count >= 5:
            earned = True
        elif key == "TASKS_10_COMPLETED" and completed_count >= 10:
            earned = True
        elif key == "HIGH_COMPLEXITY_MASTER" and metrics["weighted_productivity"] >= 75.0:
            earned = True
        elif key == "SPEED_DEMON" and metrics["on_time_rate"] >= 100.0 and completed_count >= 2:
            earned = True

        if earned:
            ach = DeveloperAchievement(
                developer_id=developer_id,
                achievement_key=key,
                category=item["category"],
                title=item["title"],
                description=item["description"],
                icon=item["icon"],
            )
            db.add(ach)
            new_achievements.append(ach)

    if new_achievements:
        db.commit()

    all_achievements = db.execute(
        select(DeveloperAchievement).where(DeveloperAchievement.developer_id == developer_id)
    ).scalars().all()
    return list(all_achievements)


def calculate_and_record_incentive_points(
    db: Session, developer_id: uuid.UUID, task_id: uuid.UUID, is_on_time: bool = True
) -> DeveloperIncentiveLedger:
    """
    Calculates incentive points for completing a task:
    - Base Points = Task Weight * 10
    - Difficulty Bonus = +20% if Task Weight >= 75
    - On-Time Bonus = +15% if on time
    - Streak Bonus = +10% per streak day (up to max +50%)
    """
    task = db.execute(select(Task).where(Task.id == task_id)).scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    task_weight = float(task.task_weight_score) if task.task_weight_score is not None else calculate_task_weight_score(task)

    streak_rec = db.execute(
        select(DeveloperStreak).where(DeveloperStreak.developer_id == developer_id)
    ).scalar_one_or_none()
    current_streak = streak_rec.current_streak if streak_rec else 0

    base_points = round(task_weight * 10.0, 2)

    if task_weight >= 75.0:
        difficulty_bonus = round(base_points * 0.20, 2)
    else:
        difficulty_bonus = 0.0

    if is_on_time:
        on_time_bonus = round(base_points * 0.15, 2)
    else:
        on_time_bonus = 0.0

    streak_multiplier = min(0.50, current_streak * 0.10)
    streak_bonus = round(base_points * streak_multiplier, 2)

    total_points = round(base_points + difficulty_bonus + on_time_bonus + streak_bonus, 2)

    ledger_entry = DeveloperIncentiveLedger(
        developer_id=developer_id,
        task_id=task_id,
        base_points=Decimal(str(base_points)),
        difficulty_bonus=Decimal(str(difficulty_bonus)),
        on_time_bonus=Decimal(str(on_time_bonus)),
        streak_bonus=Decimal(str(streak_bonus)),
        total_points=Decimal(str(total_points)),
        description=f"Incentive points for completing task '{task.title}' (Weight: {task_weight:.1f})",
    )
    db.add(ledger_entry)
    db.commit()
    db.refresh(ledger_entry)
    return ledger_entry


def snapshot_developer_performance(
    db: Session, developer_id: uuid.UUID
) -> DeveloperPerformanceSnapshot:
    """
    Creates a performance snapshot for trend tracking and updates DeveloperProfile.performance_score.
    """
    metrics = calculate_developer_performance_metrics(db, developer_id)

    # Sync DeveloperProfile.performance_score
    dev_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()
    if dev_profile:
        dev_profile.performance_score = Decimal(str(metrics["performance_score"]))
        db.commit()

    # Sum total incentive points
    total_incentive_points = db.execute(
        select(func.coalesce(func.sum(DeveloperIncentiveLedger.total_points), 0)).where(
            DeveloperIncentiveLedger.developer_id == developer_id
        )
    ).scalar()

    snapshot = DeveloperPerformanceSnapshot(
        developer_id=developer_id,
        performance_score=Decimal(str(metrics["performance_score"])),
        completion_rate=Decimal(str(metrics["completion_rate"])),
        on_time_rate=Decimal(str(metrics["on_time_rate"])),
        weighted_productivity=Decimal(str(metrics["weighted_productivity"])),
        current_streak=metrics["current_streak"],
        total_incentive_points=Decimal(str(total_incentive_points)),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
