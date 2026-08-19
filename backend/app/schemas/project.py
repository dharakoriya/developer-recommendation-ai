import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import ProjectStatus, AvailabilityStatus


class TeamMemberAdd(BaseModel):
    developer_id: uuid.UUID


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    developer_id: uuid.UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    experience_years: Optional[Decimal] = None
    availability_status: Optional[AvailabilityStatus] = None
    joined_at: datetime
    left_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None


class TeamResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members_count: Optional[int] = 0
    members: List[TeamMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: ProjectStatus
    created_by: uuid.UUID
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    teams_count: Optional[int] = 0
    teams: List[TeamResponse] = []

    model_config = ConfigDict(from_attributes=True)
