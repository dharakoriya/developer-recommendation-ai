from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.api.deps import get_current_user
from app.schemas.analytics import (
    ProjectHealthOverviewResponse,
    TeamCapacityMetrics,
    DeveloperComparisonResponse,
    TaskIntelligenceMetrics,
    RecommendationEffectivenessResponse,
    DeveloperPersonalAnalytics,
)
from app.services.analytics_service import (
    get_project_health_analytics,
    get_team_capacity_analytics,
    get_developer_comparison_matrix,
    get_task_intelligence_metrics,
    get_recommendation_effectiveness_funnel,
    get_developer_personal_analytics,
)

router = APIRouter()


@router.get("/projects", response_model=ProjectHealthOverviewResponse, summary="Get Project Health Overview & Scores")
def get_project_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns real-time calculated Project Health Scores (0-100).
    DEVELOPER role: receives 403 — use /analytics/developer/me for personal work analytics.
    MANAGER/ADMIN: org-wide or project-scoped data.
    """
    if current_user.role == UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Use /api/analytics/developer/me for your personal work intelligence.",
        )
    return get_project_health_analytics(db)


@router.get("/teams", response_model=TeamCapacityMetrics, summary="Get Team Capacity & Workload Distribution")
def get_team_capacity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns team capacity metrics, workload distribution, and team productivity metrics.
    DEVELOPER role: receives 403 — use /analytics/developer/me for personal workload data.
    MANAGER/ADMIN: org-wide capacity view.
    """
    if current_user.role == UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Use /api/analytics/developer/me for your personal workload analytics.",
        )
    return get_team_capacity_analytics(db)


@router.get("/developers", response_model=DeveloperComparisonResponse, summary="Get Developer Comparison Matrix")
def get_developer_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns side-by-side developer comparison matrix for Admin and Manager roles.
    Developers are denied access (403 Forbidden).
    """
    if current_user.role == UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Developer role is restricted to viewing personal performance metrics only.",
        )
    return get_developer_comparison_matrix(db, manager_user_id=current_user.id if current_user.role == UserRole.MANAGER else None)


@router.get("/tasks", response_model=TaskIntelligenceMetrics, summary="Get Task Intelligence & Weight Distribution")
def get_task_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns task breakdown by priority, complexity, status, weight distribution.
    DEVELOPER role: receives 403 — personal task data is in /analytics/developer/me.
    MANAGER/ADMIN: org-wide task intelligence.
    """
    if current_user.role == UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Use /api/analytics/developer/me for your task analytics.",
        )
    return get_task_intelligence_metrics(db)


@router.get("/recommendations", response_model=RecommendationEffectivenessResponse, summary="Get Recommendation Conversion Funnel")
def get_recommendation_effectiveness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns production recommendation conversion funnel.
    DEVELOPER role: receives 403 — recommendation system is manager/admin only.
    """
    if current_user.role == UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Recommendation effectiveness analytics are restricted to managers and admins.",
        )
    return get_recommendation_effectiveness_funnel(db)


@router.get("/developer/me", response_model=DeveloperPersonalAnalytics, summary="Get personal developer analytics")
def get_my_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns personal work analytics for the authenticated developer.
    Only returns data for the authenticated user — no cross-developer data exposure.
    Accessible to any role (shows personal dev profile data).
    """
    return get_developer_personal_analytics(db, current_user)
