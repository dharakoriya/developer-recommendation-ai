import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus


# Task Skill Schemas
class TaskSkillCreate(BaseModel):
    skill_id: uuid.UUID
    required_level: Decimal = Field(..., ge=0, le=100)


class TaskSkillUpdate(BaseModel):
    required_level: Decimal = Field(..., ge=0, le=100)


class TaskSkillResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None
    required_level: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Assignment Schemas
class AssignmentCreate(BaseModel):
    task_id: Optional[uuid.UUID] = None
    developer_id: uuid.UUID
    recommendation_id: Optional[uuid.UUID] = None
    selection_reason: Optional[str] = None
    override_reason: Optional[str] = None
    force_override: bool = False
    notes: Optional[str] = None


class AssignmentUpdateStatus(BaseModel):
    status: AssignmentStatus
    notes: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    developer_id: uuid.UUID
    developer_name: Optional[str] = None
    developer_email: Optional[str] = None
    assigned_by: uuid.UUID
    assigner_name: Optional[str] = None
    status: AssignmentStatus
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    reassigned_at: Optional[datetime] = None
    notes: Optional[str] = None
    selection_reason: Optional[str] = None
    override_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



# Task Schemas
class TaskCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    complexity: TaskComplexity = TaskComplexity.MEDIUM
    estimated_hours: Decimal = Field(..., gt=0, le=1000)
    deadline: Optional[datetime] = None
    team_id: Optional[uuid.UUID] = None
    status: TaskStatus = TaskStatus.TODO


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[TaskPriority] = None
    complexity: Optional[TaskComplexity] = None
    estimated_hours: Optional[Decimal] = Field(None, gt=0, le=1000)
    deadline: Optional[datetime] = None
    team_id: Optional[uuid.UUID] = None
    status: Optional[TaskStatus] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_name: Optional[str] = None
    team_id: Optional[uuid.UUID] = None
    team_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: TaskPriority
    complexity: TaskComplexity
    estimated_hours: Decimal
    deadline: Optional[datetime] = None
    status: TaskStatus
    assigned_developer_id: Optional[uuid.UUID] = None
    assigned_developer_name: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_actual_minutes: int = 0
    is_timer_running: bool = False
    timer_started_at: Optional[datetime] = None
    actual_hours: float = 0.0
    variance_hours: float = 0.0
    created_by: uuid.UUID
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    task_weight_score: Optional[Decimal] = None
    task_weight_category: Optional[str] = None
    required_skills: List[TaskSkillResponse] = []
    current_assignment: Optional[AssignmentResponse] = None
    assignment_history: List[AssignmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
