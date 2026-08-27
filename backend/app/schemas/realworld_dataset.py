import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import (
    FeedbackDecision,
    OutcomeStatus,
    LabelStatus,
    ValidationStatus,
    ReadinessStatus,
)


class LabelValidationRequest(BaseModel):
    validation_status: ValidationStatus
    validation_reason: Optional[str] = None


class LabelValidationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recommendation_audit_id: uuid.UUID
    observation_id: str
    proposed_research_label: Optional[int] = None
    label_status: LabelStatus
    label_reason: Optional[str] = None
    validation_status: ValidationStatus
    validator_id: Optional[uuid.UUID] = None
    validator_name: Optional[str] = None
    validation_reason: Optional[str] = None
    validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class RealworldObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    observation_id: str
    recommendation_id: uuid.UUID
    developer_id: uuid.UUID
    developer_name: str
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str
    recommendation_timestamp: datetime
    model_name: str
    model_version: str
    environment: str
    rank: int
    recommendation_score: float
    
    # Immutable Prediction-Time Snapshot
    feature_snapshot: Dict[str, Any]

    # Post-Prediction Outcomes (Separated from prediction features)
    feedback_decision: Optional[FeedbackDecision] = None
    reviewer_comment: Optional[str] = None
    was_assigned: bool = False
    assignment_id: Optional[uuid.UUID] = None
    assignment_status: Optional[str] = None
    assignment_created_at: Optional[datetime] = None
    completion_status: Optional[str] = None
    completed_at: Optional[datetime] = None
    outcome_status: OutcomeStatus = OutcomeStatus.RECOMMENDED

    # Label & Validation Metadata
    proposed_research_label: Optional[int] = None
    label_status: LabelStatus = LabelStatus.UNLABELED
    label_reason: Optional[str] = None
    validation_status: ValidationStatus = ValidationStatus.UNVALIDATED
    validator_name: Optional[str] = None
    validation_reason: Optional[str] = None
    validated_at: Optional[datetime] = None


class DataQualityReportResponse(BaseModel):
    total_observations: int
    missing_value_count: int
    duplicate_observation_count: int
    invalid_range_count: int
    temporal_leakage_flag_count: int
    invalid_lifecycle_transition_count: int
    quality_score_percentage: float
    disclaimer: str


class ClassDistributionResponse(BaseModel):
    total_observations: int
    validated_positive_count: int
    validated_negative_count: int
    weak_label_count: int
    unlabeled_count: int
    ambiguous_count: int
    class_imbalance_ratio: Optional[float] = None
    imbalance_description: str


class FeatureDistributionStats(BaseModel):
    feature_name: str
    synthetic_mean: Optional[float] = None
    synthetic_std: Optional[float] = None
    realworld_mean: Optional[float] = None
    realworld_std: Optional[float] = None
    delta_mean: Optional[float] = None


class DatasetComparisonResponse(BaseModel):
    synthetic_dataset_version: str = "synthetic-v1"
    realworld_dataset_version: str = "realworld-v1"
    synthetic_total_samples: int = 1500
    realworld_total_samples: int
    comparison_summary: str
    feature_comparisons: List[FeatureDistributionStats]


class MultiCriteriaReadinessCheck(BaseModel):
    criterion: str
    required_condition: str
    actual_value: str
    is_passed: bool


class RealworldTrainingReadinessResponse(BaseModel):
    readiness_status: ReadinessStatus
    total_observations: int
    validated_labels_count: int
    validated_positive_count: int
    validated_negative_count: int
    temporal_leakage_passed: bool
    feature_completeness_passed: bool
    lifecycle_consistency_passed: bool
    readiness_summary: str
    readiness_checks: List[MultiCriteriaReadinessCheck]


class DatasetExportMetadataResponse(BaseModel):
    dataset_version: str = "realworld-v1"
    source: str = "production_observations"
    exported_at: datetime
    total_observations: int
    labeled_observations: int
    validated_observations: int
    ambiguous_observations: int
    exported_files: List[str]
