import uuid
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

from app.models.enums import (
    TaskPriority,
    TaskComplexity,
    AIPlanStatus,
    AIPlanTaskStatus,
    AIPlanGranularity,
    AIProjectType,
)


class AIPlanningInput(BaseModel):
    project_name: str = Field(..., min_length=2, max_length=150)
    project_description: str = Field(..., min_length=10)
    business_objective: Optional[str] = None
    target_users: Optional[str] = None
    functional_requirements: Optional[str] = None
    technical_requirements: Optional[str] = None
    technology_stack: Optional[str] = None
    deadline: Optional[str] = None
    granularity: AIPlanGranularity = AIPlanGranularity.BALANCED
    project_type: AIProjectType = AIProjectType.WEB_APP
    preferred_team_size: Optional[int] = None


class AIPlanTaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    module: Optional[str] = "Core Architecture"
    priority: TaskPriority = TaskPriority.MEDIUM
    complexity: TaskComplexity = TaskComplexity.MEDIUM
    estimated_hours: float = Field(8.0, gt=0)
    required_skills: List[Union[str, Dict[str, Any]]] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)


class AIPlanTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    priority: Optional[TaskPriority] = None
    complexity: Optional[TaskComplexity] = None
    estimated_hours: Optional[float] = Field(None, gt=0)
    required_skills: Optional[List[Union[str, Dict[str, Any]]]] = None
    dependencies: Optional[List[str]] = None
    acceptance_criteria: Optional[List[str]] = None
    status: Optional[AIPlanTaskStatus] = None


class AIPlanTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    title: str
    description: Optional[str] = None
    module: Optional[str] = None
    priority: TaskPriority
    complexity: TaskComplexity
    estimated_hours: float
    required_skills: List[Union[str, Dict[str, Any]]] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)
    status: AIPlanTaskStatus
    is_manually_added: bool
    created_at: datetime
    updated_at: datetime


class AIProjectPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_name: str
    project_description: str
    business_objective: Optional[str] = None
    target_users: Optional[str] = None
    functional_requirements: Optional[str] = None
    technical_requirements: Optional[str] = None
    technology_stack: Optional[str] = None
    deadline: Optional[str] = None
    granularity: AIPlanGranularity
    project_type: AIProjectType
    preferred_team_size: Optional[int] = None
    status: AIPlanStatus
    summary_json: Optional[Dict[str, Any]] = None
    ai_provider: str
    ai_model: str
    prompt_version: str
    applied_project_id: Optional[uuid.UUID] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tasks: List[AIPlanTaskResponse] = Field(default_factory=list)


class TaskCapabilityAnalysis(BaseModel):
    task_id: uuid.UUID
    task_title: str
    module: Optional[str] = None
    status_classification: str  # "WELL_SUPPORTED", "CAPACITY_RISK", "SKILL_GAP"
    required_skills: List[Union[str, Dict[str, Any]]]
    matching_developers: List[Dict[str, Any]]
    reason: str


class TeamCapabilityAnalysisResponse(BaseModel):
    plan_id: uuid.UUID
    total_generated_tasks: int
    well_supported_count: int
    capacity_risk_count: int
    skill_gap_count: int
    missing_skills: List[str]
    resource_bottlenecks: List[Dict[str, Any]]
    task_analyses: List[TaskCapabilityAnalysis]


class SkillResolution(BaseModel):
    skill_name: str
    action: str  # "CREATE_NEW", "MAP_EXISTING", "REMOVE"
    mapped_existing_skill_id: Optional[uuid.UUID] = None


class PlanApplyRequest(BaseModel):
    project_id: Optional[uuid.UUID] = None
    create_new_project: bool = True
    team_id: Optional[uuid.UUID] = None
    skill_resolutions: List[SkillResolution] = Field(default_factory=list)


class PlanApplyResponse(BaseModel):
    plan_id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    created_tasks_count: int
    created_task_ids: List[uuid.UUID]
    applied_at: datetime
