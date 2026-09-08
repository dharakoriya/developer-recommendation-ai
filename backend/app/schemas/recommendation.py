import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import ShapDirection, AvailabilityStatus


class ModelMetadataResponse(BaseModel):
    model_type: str
    model_version: str
    training_required: bool
    training_dataset: Optional[str] = None
    validation_accuracy: Optional[float] = None
    description: str


class RecommendationExplanationResponse(BaseModel):
    id: uuid.UUID
    feature_name: str
    feature_value: Optional[str] = None
    contribution_score: float
    direction: ShapDirection

    model_config = ConfigDict(from_attributes=True)


class RecommendationResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    developer_id: uuid.UUID
    developer_name: str
    developer_email: str
    experience_years: float
    availability_status: AvailabilityStatus
    workload_score: float
    skill_coverage_ratio: float
    performance_score: float
    model_version: str
    score: float
    rank: int
    eligibility_status: str = "ELIGIBLE"
    exclusion_reasons: List[str] = []
    task_weight_score: Optional[float] = None
    task_weight_category: Optional[str] = None
    is_stale: bool = False
    created_at: datetime
    explanations: List[RecommendationExplanationResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RecommendationListResponse(BaseModel):
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str
    model_type: str
    model_version: str
    freshness_status: str = "FRESH"
    total_recommendations: int
    recommendations: List[RecommendationResponse]
    excluded_recommendations: List[RecommendationResponse] = []
