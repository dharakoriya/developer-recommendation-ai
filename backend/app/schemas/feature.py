import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class FeatureMetadataItem(BaseModel):
    feature_name: str
    data_type: str
    category: str
    source: str
    description: str


class CandidateFeatureVector(BaseModel):
    developer_id: uuid.UUID
    user_name: str
    user_email: str
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str

    # Developer Features
    dev_experience_years: float
    dev_availability_status: str
    dev_availability_encoded: float
    dev_performance_score: float
    dev_total_skills_count: int
    dev_workload_score: float
    dev_capacity_hours: float
    dev_active_task_count: int
    dev_workload_status: str
    dev_workload_status_encoded: int

    # Task Features
    task_estimated_hours: float
    task_complexity: str
    task_complexity_encoded: int
    task_priority: str
    task_priority_encoded: int
    task_status: str
    task_required_skill_count: int

    # Skill Match Features
    matching_skill_count: int
    skill_coverage_ratio: float
    avg_required_level: float
    avg_developer_level: float
    avg_proficiency_gap: float
    min_proficiency_gap: float
    weighted_skill_match_score: float

    # Historical Assignment & Target Label
    is_historically_assigned: int
    label_target: Optional[int] = None  # Explicitly null until ground truth labels exist

    model_config = ConfigDict(from_attributes=True)


class TaskCandidatesResponse(BaseModel):
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str
    total_candidates: int
    candidates: List[CandidateFeatureVector]


class DatasetExportResponse(BaseModel):
    total_rows: int
    total_features: int
    columns: List[str]
    csv_content: str
    label_disclaimer: str
