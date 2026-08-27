import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import ReadinessStatus


class ModelVersionObservationCount(BaseModel):
    model_version: str
    count: int


class EnvironmentObservationCount(BaseModel):
    environment: str
    count: int


class DataCollectionMonitoringResponse(BaseModel):
    total_observations: int
    observations_this_week: int
    observations_this_month: int
    by_model_version: List[ModelVersionObservationCount]
    by_environment: List[EnvironmentObservationCount]
    total_feedback_submitted: int
    accepted_feedback_count: int
    rejected_feedback_count: int
    ignored_feedback_count: int
    deferred_feedback_count: int
    assigned_count: int
    completed_count: int
    reassigned_count: int
    cancelled_count: int
    weak_positive_labels: int
    weak_negative_labels: int
    ambiguous_observations: int
    unlabeled_observations: int
    validated_positive_labels: int
    validated_negative_labels: int


class DatasetGrowthPoint(BaseModel):
    period: str
    timestamp: datetime
    total_observations: int
    labeled_observations: int
    validated_observations: int
    positive_labels: int
    negative_labels: int


class DatasetGrowthResponse(BaseModel):
    dataset_version: str = "realworld-v1"
    time_series: List[DatasetGrowthPoint]
    growth_summary: str


class LabelQualityMonitoringResponse(BaseModel):
    label_coverage_percentage: float
    validated_label_percentage: float
    weak_label_rate: float
    ambiguous_rate: float
    rejected_label_rate: float
    validation_turnaround_hours: Optional[float] = None
    positive_negative_ratio: Optional[float] = None
    anomaly_warnings: List[str]


class OutcomeFunnelStage(BaseModel):
    stage_name: str
    count: int
    conversion_percentage: float


class OutcomeFunnelResponse(BaseModel):
    funnel_stages: List[OutcomeFunnelStage]
    alternate_paths: Dict[str, int]
    funnel_summary: str


class ConcentrationWarning(BaseModel):
    dimension: str
    warning_message: str


class DatasetDiversityResponse(BaseModel):
    unique_developers_count: int
    unique_tasks_count: int
    unique_projects_count: int
    complexity_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    availability_distribution: Dict[str, int]
    workload_distribution: Dict[str, int]
    concentration_warnings: List[ConcentrationWarning]


class DatasetSnapshotCreateRequest(BaseModel):
    dataset_version: str
    source_observation_range: Optional[str] = "all_available"


class DatasetSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_version: str
    created_by_id: Optional[uuid.UUID] = None
    created_by_name: Optional[str] = None
    creation_timestamp: datetime
    source_observation_range: str
    total_observations: int
    labeled_observations: int
    validated_labels: int
    positive_labels: int
    negative_labels: int
    ambiguous_observations: int
    feature_version: str
    label_methodology_version: str
    data_quality_status: str
    snapshot_metadata: Dict[str, Any]
