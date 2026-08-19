import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import AvailabilityStatus
from app.schemas.task import TaskResponse


class WorkloadSummaryItem(BaseModel):
    developer_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    experience_years: Decimal
    availability_status: AvailabilityStatus
    active_task_count: int
    total_estimated_hours: Decimal
    weighted_hours: Decimal
    capacity_hours: Decimal
    workload_score: Decimal
    workload_status: str

    model_config = ConfigDict(from_attributes=True)


class WorkloadSummaryResponse(BaseModel):
    total_developers: int
    available_developers_count: int
    balanced_developers_count: int
    high_workload_count: int
    overloaded_developers_count: int
    average_workload_score: Decimal
    developers: List[WorkloadSummaryItem]


class DeveloperWorkloadDetailResponse(BaseModel):
    developer_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    experience_years: Decimal
    availability_status: AvailabilityStatus
    active_task_count: int
    total_estimated_hours: Decimal
    weighted_hours: Decimal
    capacity_hours: Decimal
    workload_score: Decimal
    workload_status: str
    active_tasks: List[TaskResponse] = []
    last_snapshot_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class WorkloadRecordResponse(BaseModel):
    id: uuid.UUID
    developer_id: uuid.UUID
    workload_score: Decimal
    active_task_count: int
    estimated_hours: Decimal
    availability_factor: Optional[Decimal] = None
    calculated_at: datetime

    model_config = ConfigDict(from_attributes=True)
