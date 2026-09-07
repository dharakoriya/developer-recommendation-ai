import uuid
from decimal import Decimal
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import AvailabilityStatus


class DeveloperStreakResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    developer_id: uuid.UUID
    current_streak: int
    longest_streak: int
    last_completion_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class DeveloperAchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    developer_id: uuid.UUID
    achievement_key: str
    category: str
    title: str
    description: str
    icon: str
    earned_at: datetime


class DeveloperIncentiveLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    developer_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    base_points: float
    difficulty_bonus: float
    on_time_bonus: float
    streak_bonus: float
    total_points: float
    description: Optional[str] = None
    earned_at: datetime


class DeveloperPerformanceSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    developer_id: uuid.UUID
    performance_score: float
    completion_rate: float
    on_time_rate: float
    weighted_productivity: float
    current_streak: int
    total_incentive_points: float
    snapshot_at: datetime


class DeveloperPerformanceDetailResponse(BaseModel):
    developer_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    experience_years: float
    availability_status: AvailabilityStatus
    performance_score: float
    completion_rate: float
    on_time_rate: float
    weighted_productivity: float
    total_assigned_tasks: int
    completed_tasks: int
    current_streak: int
    longest_streak: int
    total_incentive_points: float
    achievements: List[DeveloperAchievementResponse]
    recent_incentives: List[DeveloperIncentiveLedgerResponse]
    performance_trend: List[DeveloperPerformanceSnapshotResponse]


class PerformanceLeaderboardItem(BaseModel):
    developer_id: uuid.UUID
    user_name: str
    user_email: str
    experience_years: float
    availability_status: AvailabilityStatus
    performance_score: float
    completion_rate: float
    on_time_rate: float
    weighted_productivity: float
    current_streak: int
    total_incentive_points: float
    completed_tasks: int
    workload_score: float


class TeamPerformanceAnalyticsResponse(BaseModel):
    total_developers: int
    avg_performance_score: float
    avg_completion_rate: float
    top_performers: List[PerformanceLeaderboardItem]
    highest_productivity: List[PerformanceLeaderboardItem]
    best_streaks: List[PerformanceLeaderboardItem]
    task_difficulty_distribution: dict
    leaderboard: List[PerformanceLeaderboardItem]


class AdminIncentiveAdjustmentRequest(BaseModel):
    developer_id: uuid.UUID
    points: float
    reason: str

