import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import FeedbackDecision, OutcomeStatus, LabelStatus


class FeedbackCreateRequest(BaseModel):
    decision: FeedbackDecision
    comment: Optional[str] = Field(None, max_length=1000)


class RecommendationFeedbackResponse(BaseModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    reviewer_name: Optional[str] = None
    decision: FeedbackDecision
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationAuditResponse(BaseModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    developer_id: uuid.UUID
    developer_name: str
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str
    rank: int
    recommendation_score: float
    model_name: str
    model_version: str
    environment: str
    feature_snapshot: Dict[str, Any]
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationOutcomeResponse(BaseModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID
    developer_id: uuid.UUID
    developer_name: str
    task_id: uuid.UUID
    task_title: str
    was_assigned: bool
    assignment_id: Optional[uuid.UUID] = None
    assignment_created_at: Optional[datetime] = None
    assignment_outcome_status: OutcomeStatus
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelRegistryResponse(BaseModel):
    model_name: str
    model_version: str
    dataset_version: str
    label_strategy: str
    feature_version: str
    training_date: Optional[str] = None
    training_rows: Optional[int] = None
    validation_rows: Optional[int] = None
    test_rows: Optional[int] = None
    threshold: Optional[float] = None
    evaluation_metrics: Dict[str, Any] = {}
    artifact_location: str
    environment: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class DatasetPreviewMetricsResponse(BaseModel):
    total_recommendations: int
    total_feedbacks: int
    total_assignments: int
    completed_assignments: int
    observations_with_outcomes: int
    labeled_observations: int
    unlabeled_observations: int
    weak_labels: int
    validated_labels: int
    real_world_ml_training_readiness: bool
    readiness_assessment: str
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)
