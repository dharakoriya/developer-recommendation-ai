import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=100)


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=100)


class SkillResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeveloperSkillAssign(BaseModel):
    skill_id: uuid.UUID
    proficiency_level: Decimal = Field(..., ge=0, le=100)


class DeveloperSkillUpdate(BaseModel):
    proficiency_level: Decimal = Field(..., ge=0, le=100)


class DeveloperSkillResponse(BaseModel):
    id: uuid.UUID
    developer_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None
    proficiency_level: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
