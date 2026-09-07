import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.database import get_db
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.task import Task, Assignment
from app.models.performance import (
    DeveloperStreak,
    DeveloperAchievement,
    DeveloperIncentiveLedger,
    DeveloperPerformanceSnapshot,
)
from app.models.enums import UserRole, AvailabilityStatus
from app.schemas.performance import (
    DeveloperStreakResponse,
    DeveloperAchievementResponse,
    DeveloperIncentiveLedgerResponse,
    DeveloperPerformanceSnapshotResponse,
    DeveloperPerformanceDetailResponse,
    PerformanceLeaderboardItem,
    TeamPerformanceAnalyticsResponse,
)
from app.api.deps import get_current_user, require_roles
from app.services.performance_service import (
    calculate_developer_performance_metrics,
    evaluate_and_grant_developer_achievements,
)
from app.services.workload_service import calculate_developer_workload_details

router = APIRouter()


@router.get(
    "/developers/{developer_id}/performance",
    response_model=DeveloperPerformanceDetailResponse,
    summary="Get detailed developer performance metrics",
)
def get_developer_performance(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves complete developer performance intelligence:
    - Overview performance score, completion rate, weighted productivity
    - Streak stats
    - Earned achievements
    - Incentive ledger records
    - Historical snapshots
    Accessible to ADMIN, MANAGER, or self DEVELOPER.
    """
    dev = db.execute(
        select(DeveloperProfile)
        .options(joinedload(DeveloperProfile.user))
        .where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    # RBAC protection: DEVELOPER can only inspect their own profile
    if current_user.role == UserRole.DEVELOPER and dev.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only view your own performance metrics.",
        )

    metrics = calculate_developer_performance_metrics(db, developer_id)

    # Get streak
    streak_rec = db.execute(
        select(DeveloperStreak).where(DeveloperStreak.developer_id == developer_id)
    ).scalar_one_or_none()

    current_streak = streak_rec.current_streak if streak_rec else 0
    longest_streak = streak_rec.longest_streak if streak_rec else 0

    # Get achievements
    achievements_orm = evaluate_and_grant_developer_achievements(db, developer_id)
    achievements_resp = [
        DeveloperAchievementResponse(
            id=a.id,
            developer_id=a.developer_id,
            achievement_key=a.achievement_key,
            category=a.category,
            title=a.title,
            description=a.description,
            icon=a.icon,
            earned_at=a.earned_at,
        )
        for a in achievements_orm
    ]

    # Get incentives
    incentives_orm = db.execute(
        select(DeveloperIncentiveLedger)
        .where(DeveloperIncentiveLedger.developer_id == developer_id)
        .order_by(DeveloperIncentiveLedger.earned_at.desc())
    ).scalars().all()

    total_incentive_points = sum(float(i.total_points) for i in incentives_orm)

    incentives_resp = [
        DeveloperIncentiveLedgerResponse(
            id=i.id,
            developer_id=i.developer_id,
            task_id=i.task_id,
            base_points=float(i.base_points),
            difficulty_bonus=float(i.difficulty_bonus),
            on_time_bonus=float(i.on_time_bonus),
            streak_bonus=float(i.streak_bonus),
            total_points=float(i.total_points),
            description=i.description,
            earned_at=i.earned_at,
        )
        for i in incentives_orm[:10]  # recent 10
    ]

    # Get snapshots
    snapshots_orm = db.execute(
        select(DeveloperPerformanceSnapshot)
        .where(DeveloperPerformanceSnapshot.developer_id == developer_id)
        .order_by(DeveloperPerformanceSnapshot.snapshot_at.asc())
    ).scalars().all()

    snapshots_resp = [
        DeveloperPerformanceSnapshotResponse(
            id=s.id,
            developer_id=s.developer_id,
            performance_score=float(s.performance_score),
            completion_rate=float(s.completion_rate),
            on_time_rate=float(s.on_time_rate),
            weighted_productivity=float(s.weighted_productivity),
            current_streak=s.current_streak,
            total_incentive_points=float(s.total_incentive_points),
            snapshot_at=s.snapshot_at,
        )
        for s in snapshots_orm
    ]

    return DeveloperPerformanceDetailResponse(
        developer_id=dev.id,
        user_id=dev.user_id,
        user_name=dev.user.name if dev.user else "Unknown",
        user_email=dev.user.email if dev.user else "",
        experience_years=float(dev.experience_years),
        availability_status=dev.availability_status,
        performance_score=metrics["performance_score"],
        completion_rate=metrics["completion_rate"],
        on_time_rate=metrics["on_time_rate"],
        weighted_productivity=metrics["weighted_productivity"],
        total_assigned_tasks=metrics["total_assignments"],
        completed_tasks=metrics["completed_tasks"],
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_incentive_points=total_incentive_points,
        achievements=achievements_resp,
        recent_incentives=incentives_resp,
        performance_trend=snapshots_resp,
    )


@router.get(
    "/analytics/performance",
    response_model=TeamPerformanceAnalyticsResponse,
    summary="Get manager team performance analytics",
)
def get_team_performance_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Retrieves team-wide performance analytics, rankings, and distribution breakdown.
    Requires ADMIN or MANAGER role.
    """
    devs = db.execute(
        select(DeveloperProfile).options(joinedload(DeveloperProfile.user))
    ).scalars().all()

    items: List[PerformanceLeaderboardItem] = []
    total_score_sum = 0.0
    total_completion_sum = 0.0

    task_complexity_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}

    # Count task complexity distribution
    all_tasks = db.execute(select(Task)).scalars().all()
    for t in all_tasks:
        c_name = t.complexity.value if hasattr(t.complexity, "value") else str(t.complexity)
        if c_name in task_complexity_counts:
            task_complexity_counts[c_name] += 1

    for dev in devs:
        metrics = calculate_developer_performance_metrics(db, dev.id)
        workload = calculate_developer_workload_details(db, dev.id)

        inc_total = db.execute(
            select(func.coalesce(func.sum(DeveloperIncentiveLedger.total_points), 0)).where(
                DeveloperIncentiveLedger.developer_id == dev.id
            )
        ).scalar()

        item = PerformanceLeaderboardItem(
            developer_id=dev.id,
            user_name=dev.user.name if dev.user else "Unknown",
            user_email=dev.user.email if dev.user else "",
            experience_years=float(dev.experience_years),
            availability_status=dev.availability_status,
            performance_score=metrics["performance_score"],
            completion_rate=metrics["completion_rate"],
            on_time_rate=metrics["on_time_rate"],
            weighted_productivity=metrics["weighted_productivity"],
            current_streak=metrics["current_streak"],
            total_incentive_points=float(inc_total),
            completed_tasks=metrics["completed_tasks"],
            workload_score=float(workload.workload_score),
        )
        items.append(item)
        total_score_sum += metrics["performance_score"]
        total_completion_sum += metrics["completion_rate"]

    dev_count = len(items)
    avg_score = round(total_score_sum / max(1, dev_count), 2)
    avg_completion = round(total_completion_sum / max(1, dev_count), 2)

    leaderboard = sorted(items, key=lambda x: x.performance_score, reverse=True)
    top_performers = leaderboard[:3]
    highest_productivity = sorted(items, key=lambda x: x.weighted_productivity, reverse=True)[:3]
    best_streaks = sorted(items, key=lambda x: x.current_streak, reverse=True)[:3]

    return TeamPerformanceAnalyticsResponse(
        total_developers=dev_count,
        avg_performance_score=avg_score,
        avg_completion_rate=avg_completion,
        top_performers=top_performers,
        highest_productivity=highest_productivity,
        best_streaks=best_streaks,
        task_difficulty_distribution=task_complexity_counts,
        leaderboard=leaderboard,
    )
