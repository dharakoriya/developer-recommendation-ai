import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import AvailabilityStatus
from app.schemas.skill import DeveloperSkillResponse


class DeveloperCreate(BaseModel):
    user_id: uuid.UUID
    experience_years: Decimal = Field(..., ge=0, le=70)
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    performance_score: Optional[Decimal] = Field(None, ge=0, le=100)


class DeveloperUpdate(BaseModel):
    experience_years: Optional[Decimal] = Field(None, ge=0, le=70)
    availability_status: Optional[AvailabilityStatus] = None
    performance_score: Optional[Decimal] = Field(None, ge=0, le=100)


class DeveloperResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    experience_years: Decimal
    availability_status: AvailabilityStatus
    performance_score: Optional[Decimal] = None
    workload_score: Optional[Decimal] = None
    workload_status: Optional[str] = None
    completion_rate: Optional[float] = None
    productivity_score: Optional[float] = None
    active_task_count: Optional[int] = None
    delivery_risk_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    skills: List[DeveloperSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)
