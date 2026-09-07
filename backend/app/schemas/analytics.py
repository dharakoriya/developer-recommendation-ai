import uuid
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class ProjectHealthMetrics(BaseModel):
    project_id: uuid.UUID
    project_name: str
    description: Optional[str] = None
    health_score: float = Field(..., description="Project Health Score 0 - 100")
    health_status: str = Field(..., description="HEALTHY (85-100), AT RISK (60-84), CRITICAL (0-59)")
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    unassigned_tasks: int
    developer_count: int
    high_risk_workload_count: int
    risk_factors: List[str] = []


class ProjectHealthOverviewResponse(BaseModel):
    overall_avg_health_score: float
    healthy_projects_count: int
    at_risk_projects_count: int
    critical_projects_count: int
    projects: List[ProjectHealthMetrics]


class WorkloadDistributionBreakdown(BaseModel):
    underutilized: int
    balanced: int
    high_workload: int
    overloaded: int


class TeamProductivityMetrics(BaseModel):
    tasks_completed: int
    weighted_tasks_completed: float
    avg_performance_score: float
    avg_completion_rate: float


class TeamCapacityMetrics(BaseModel):
    total_teams: int
    total_developers: int
    total_capacity_hours: float
    used_capacity_hours: float
    available_capacity_hours: float
    capacity_utilization_pct: float
    workload_distribution: WorkloadDistributionBreakdown
    team_productivity: TeamProductivityMetrics


class DeveloperComparisonItem(BaseModel):
    developer_id: uuid.UUID
    user_name: str
    email: str
    performance_score: float
    completion_rate: float
    weighted_productivity: float
    current_workload_score: float
    current_workload_hours: float
    experience_years: float
    current_streak: int
    incentive_points: int
    top_skills: List[str]
    availability_status: str


class DeveloperComparisonResponse(BaseModel):
    total_developers: int
    developers: List[DeveloperComparisonItem]


class TaskWeightDistributionBreakdown(BaseModel):
    low_weight: int       # < 20
    medium_weight: int    # 20 - 49
    high_weight: int      # 50 - 74
    critical_weight: int  # 75+


class TaskIntelligenceMetrics(BaseModel):
    total_tasks: int
    priority_distribution: Dict[str, int]
    complexity_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    project_distribution: Dict[str, int]
    weight_distribution: TaskWeightDistributionBreakdown
    avg_estimated_hours: float
    avg_actual_completion_hours: float
    on_time_completion_rate: float


class RecommendationEffectivenessResponse(BaseModel):
    recommendations_generated: int
    recommendations_accepted: int
    recommendations_rejected: int
    assignments_created: int
    tasks_completed: int
    acceptance_rate: float
    assignment_conversion_rate: float
    completion_conversion_rate: float
    has_sufficient_data: bool
    message: str
