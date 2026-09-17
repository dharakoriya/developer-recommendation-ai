import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.enums import UserRole, AvailabilityStatus
from app.schemas.developer import DeveloperResponse


class UserAdminCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.DEVELOPER
    # Developer-specific optional fields (used when role == DEVELOPER)
    experience_years: Optional[Decimal] = Field(Decimal("2.0"), ge=0, le=70)
    availability_status: Optional[AvailabilityStatus] = AvailabilityStatus.AVAILABLE
    initial_skills: Optional[List[uuid.UUID]] = None


class UserAdminUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserStatusToggle(BaseModel):
    is_active: bool


class UserResetPassword(BaseModel):
    new_password: str = Field(..., min_length=6)


class UserAdminResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    developer_profile: Optional[DeveloperResponse] = None

    model_config = ConfigDict(from_attributes=True)


class UserSummaryResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    admin_count: int
    manager_count: int
    developer_count: int
    users: List[UserAdminResponse]
