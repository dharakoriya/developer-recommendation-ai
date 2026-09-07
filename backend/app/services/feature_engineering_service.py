import uuid
import io
import csv
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.developer import DeveloperProfile, DeveloperSkill
from app.models.task import Task, TaskSkill, Assignment
from app.models.enums import TaskComplexity, TaskPriority, TaskStatus, AvailabilityStatus
from app.schemas.feature import (
    CandidateFeatureVector,
    TaskCandidatesResponse,
    FeatureMetadataItem,
    DatasetExportResponse,
)
from app.services.workload_service import calculate_developer_workload_details

AVAILABILITY_ENCODING = {
    AvailabilityStatus.AVAILABLE: 1.0,
    AvailabilityStatus.PARTIAL: 0.5,
    AvailabilityStatus.UNAVAILABLE: 0.0,
}

WORKLOAD_STATUS_ENCODING = {
    "AVAILABLE": 0,
    "BALANCED": 1,
    "HIGH": 2,
    "OVERLOADED": 3,
}

COMPLEXITY_ENCODING = {
    TaskComplexity.LOW: 1,
    TaskComplexity.MEDIUM: 2,
    TaskComplexity.HIGH: 3,
}

PRIORITY_ENCODING = {
    TaskPriority.LOW: 1,
    TaskPriority.MEDIUM: 2,
    TaskPriority.HIGH: 3,
    TaskPriority.CRITICAL: 4,
}

TASK_STATUS_ENCODING = {
    TaskStatus.TODO: 0,
    TaskStatus.IN_PROGRESS: 1,
    TaskStatus.COMPLETED: 2,
    TaskStatus.BLOCKED: 3,
    TaskStatus.CANCELLED: 4,
}


def get_feature_metadata_catalog() -> List[FeatureMetadataItem]:
    return [
        FeatureMetadataItem(
            feature_name="dev_experience_years",
            data_type="float",
            category="Developer Profile",
            source="DeveloperProfile.experience_years",
            description="Years of professional software engineering experience",
        ),
        FeatureMetadataItem(
            feature_name="dev_availability_status",
            data_type="string",
            category="Developer Profile",
            source="DeveloperProfile.availability_status",
            description="Current developer availability state (AVAILABLE, PARTIAL, UNAVAILABLE)",
        ),
        FeatureMetadataItem(
            feature_name="dev_availability_encoded",
            data_type="float",
            category="Developer Profile",
            source="Derived Encoding",
            description="Numerical availability multiplier (AVAILABLE=1.0, PARTIAL=0.5, UNAVAILABLE=0.0)",
        ),
        FeatureMetadataItem(
            feature_name="dev_performance_score",
            data_type="float",
            category="Developer Profile",
            source="DeveloperProfile.performance_score",
            description="Historical performance rating (0..100)",
        ),
        FeatureMetadataItem(
            feature_name="dev_total_skills_count",
            data_type="integer",
            category="Developer Profile",
            source="DeveloperSkill Count",
            description="Total technical skills registered on developer profile",
        ),
        FeatureMetadataItem(
            feature_name="dev_workload_score",
            data_type="float",
            category="Workload Engine",
            source="WorkloadService.calculate_developer_workload_details",
            description="Calculated active workload percentage",
        ),
        FeatureMetadataItem(
            feature_name="dev_capacity_hours",
            data_type="float",
            category="Workload Engine",
            source="WorkloadService.calculate_developer_workload_details",
            description="Total weekly capacity hours based on availability",
        ),
        FeatureMetadataItem(
            feature_name="dev_active_task_count",
            data_type="integer",
            category="Workload Engine",
            source="WorkloadService.calculate_developer_workload_details",
            description="Number of currently active assigned tasks",
        ),
        FeatureMetadataItem(
            feature_name="dev_workload_status",
            data_type="string",
            category="Workload Engine",
            source="WorkloadService.calculate_developer_workload_details",
            description="Workload balance status (AVAILABLE, BALANCED, HIGH, OVERLOADED)",
        ),
        FeatureMetadataItem(
            feature_name="task_estimated_hours",
            data_type="float",
            category="Task Context",
            source="Task.estimated_hours",
            description="Estimated effort hours required to complete task",
        ),
        FeatureMetadataItem(
            feature_name="task_complexity",
            data_type="string",
            category="Task Context",
            source="Task.complexity",
            description="Task technical complexity level (LOW, MEDIUM, HIGH)",
        ),
        FeatureMetadataItem(
            feature_name="task_priority",
            data_type="string",
            category="Task Context",
            source="Task.priority",
            description="Task priority level (LOW, MEDIUM, HIGH, CRITICAL)",
        ),
        FeatureMetadataItem(
            feature_name="task_required_skill_count",
            data_type="integer",
            category="Task Context",
            source="TaskSkill Count",
            description="Number of required technical skills attached to task",
        ),
        FeatureMetadataItem(
            feature_name="matching_skill_count",
            data_type="integer",
            category="Skill Matching",
            source="DeveloperSkill & TaskSkill Intersection",
            description="Count of task-required skills possessed by developer",
        ),
        FeatureMetadataItem(
            feature_name="skill_coverage_ratio",
            data_type="float",
            category="Skill Matching",
            source="Derived Ratio",
            description="Proportion of required skills matched (matching / required)",
        ),
        FeatureMetadataItem(
            feature_name="avg_required_level",
            data_type="float",
            category="Skill Matching",
            source="TaskSkill.required_level Mean",
            description="Average target proficiency level required across task skills",
        ),
        FeatureMetadataItem(
            feature_name="avg_developer_level",
            data_type="float",
            category="Skill Matching",
            source="DeveloperSkill.proficiency_level Mean",
            description="Average developer proficiency level across task-required skills",
        ),
        FeatureMetadataItem(
            feature_name="avg_proficiency_gap",
            data_type="float",
            category="Skill Matching",
            source="Derived Mean Gap",
            description="Mean (developer_level - required_level) across task-required skills",
        ),
        FeatureMetadataItem(
            feature_name="min_proficiency_gap",
            data_type="float",
            category="Skill Matching",
            source="Derived Min Gap",
            description="Minimum (developer_level - required_level) across task-required skills",
        ),
        FeatureMetadataItem(
            feature_name="weighted_skill_match_score",
            data_type="float",
            category="Skill Matching",
            source="Derived Weighted Score",
            description="Normalized skill match score considering target level attainment (0..100)",
        ),
        FeatureMetadataItem(
            feature_name="is_historically_assigned",
            data_type="integer",
            category="Historical Context",
            source="Assignment Table",
            description="1 if task was assigned to developer historically, else 0",
        ),
        FeatureMetadataItem(
            feature_name="label_target",
            data_type="optional integer",
            category="Supervised Label",
            source="Ground Truth",
            description="Supervised target label (NULL — ground truth recommendation label not yet available)",
        ),
    ]


def extract_developer_task_feature_vector(
    db: Session, developer_id: uuid.UUID, task_id: uuid.UUID
) -> CandidateFeatureVector:
    # 1. Query Developer Profile
    dev_stmt = (
        select(DeveloperProfile)
        .options(
            joinedload(DeveloperProfile.user),
            joinedload(DeveloperProfile.developer_skills),
        )
        .where(DeveloperProfile.id == developer_id)
    )
    dev = db.execute(dev_stmt).unique().scalar_one_or_none()
    if not dev:
        raise ValueError(f"Developer profile with ID {developer_id} not found.")

    # 2. Query Task Details
    task_stmt = (
        select(Task)
        .options(
            joinedload(Task.project),
            joinedload(Task.task_skills),
            joinedload(Task.assignments),
        )
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).unique().scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    # 3. Workload Integration
    workload_details = calculate_developer_workload_details(db, developer_id)

    # 3.5 Performance Intelligence & Task Weight Integration
    from app.services.performance_service import calculate_developer_performance_metrics
    from app.services.task_weight_service import calculate_task_weight_score

    perf_metrics = calculate_developer_performance_metrics(db, developer_id)
    t_weight = float(task.task_weight_score) if task.task_weight_score is not None else calculate_task_weight_score(task)

    # 4. Skill Matching Features
    dev_skills_dict = {
        ds.skill_id: float(ds.proficiency_level) for ds in (dev.developer_skills or [])
    }

    req_skills = task.task_skills or []
    task_req_count = len(req_skills)

    matching_count = 0
    gaps: List[float] = []
    dev_levels: List[float] = []
    req_levels: List[float] = []
    level_ratios: List[float] = []

    if task_req_count > 0:
        for ts in req_skills:
            req_lvl = float(ts.required_level)
            req_levels.append(req_lvl)

            dev_lvl = dev_skills_dict.get(ts.skill_id, 0.0)
            dev_levels.append(dev_lvl)

            if ts.skill_id in dev_skills_dict:
                matching_count += 1

            gap = dev_lvl - req_lvl
            gaps.append(gap)

            ratio = min(1.0, dev_lvl / req_lvl) if req_lvl > 0 else 1.0
            level_ratios.append(ratio)

        coverage_ratio = round(matching_count / task_req_count, 4)
        avg_req_lvl = round(sum(req_levels) / task_req_count, 2)
        avg_dev_lvl = round(sum(dev_levels) / task_req_count, 2)
        avg_gap = round(sum(gaps) / task_req_count, 2)
        min_gap = round(min(gaps), 2)
        weighted_match = round((sum(level_ratios) / task_req_count) * 100.0, 2)
    else:
        coverage_ratio = 1.0
        avg_req_lvl = 0.0
        avg_dev_lvl = 0.0
        avg_gap = 0.0
        min_gap = 0.0
        weighted_match = 100.0

    # 5. Historical Assignment Check
    is_assigned = 1 if any(a.developer_id == developer_id for a in (task.assignments or [])) else 0

    dev_perf_score = perf_metrics.get("performance_score", 75.0)

    return CandidateFeatureVector(
        developer_id=dev.id,
        user_name=dev.user.name if dev.user else "Unknown",
        user_email=dev.user.email if dev.user else "",
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",

        # Developer Features
        dev_experience_years=float(dev.experience_years),
        dev_availability_status=dev.availability_status.value if hasattr(dev.availability_status, "value") else str(dev.availability_status),
        dev_availability_encoded=AVAILABILITY_ENCODING.get(dev.availability_status, 1.0),
        dev_performance_score=dev_perf_score,
        dev_total_skills_count=len(dev.developer_skills or []),
        dev_workload_score=float(workload_details.workload_score),
        dev_capacity_hours=float(workload_details.capacity_hours),
        dev_active_task_count=workload_details.active_task_count,
        dev_workload_status=workload_details.workload_status,
        dev_workload_status_encoded=WORKLOAD_STATUS_ENCODING.get(workload_details.workload_status, 0),
        dev_completion_rate=perf_metrics.get("completion_rate", 100.0),
        dev_on_time_rate=perf_metrics.get("on_time_rate", 100.0),
        dev_weighted_productivity=perf_metrics.get("weighted_productivity", 0.0),
        dev_current_streak=perf_metrics.get("current_streak", 0),

        # Task Features
        task_estimated_hours=float(task.estimated_hours),
        task_complexity=task.complexity.value if hasattr(task.complexity, "value") else str(task.complexity),
        task_complexity_encoded=COMPLEXITY_ENCODING.get(task.complexity, 1),
        task_priority=task.priority.value if hasattr(task.priority, "value") else str(task.priority),
        task_priority_encoded=PRIORITY_ENCODING.get(task.priority, 1),
        task_status=task.status.value if hasattr(task.status, "value") else str(task.status),
        task_required_skill_count=task_req_count,
        task_weight_score=t_weight,

        # Skill Match Features
        matching_skill_count=matching_count,
        skill_coverage_ratio=coverage_ratio,
        avg_required_level=avg_req_lvl,
        avg_developer_level=avg_dev_lvl,
        avg_proficiency_gap=avg_gap,
        min_proficiency_gap=min_gap,
        weighted_skill_match_score=weighted_match,

        # Historical & Target Label
        is_historically_assigned=is_assigned,
        label_target=None,
    )


def generate_task_candidate_features(
    db: Session, task_id: uuid.UUID
) -> TaskCandidatesResponse:
    task_stmt = (
        select(Task)
        .options(joinedload(Task.project))
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    dev_stmt = select(DeveloperProfile)
    dev_profiles = db.execute(dev_stmt).scalars().all()

    candidates: List[CandidateFeatureVector] = []
    for dev in dev_profiles:
        vec = extract_developer_task_feature_vector(db, dev.id, task.id)
        candidates.append(vec)

    return TaskCandidatesResponse(
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",
        total_candidates=len(candidates),
        candidates=candidates,
    )


def generate_dataset_rows(
    db: Session, project_id: Optional[uuid.UUID] = None
) -> List[CandidateFeatureVector]:
    task_stmt = select(Task)
    if project_id:
        task_stmt = task_stmt.where(Task.project_id == project_id)

    tasks = db.execute(task_stmt).scalars().all()
    dev_profiles = db.execute(select(DeveloperProfile)).scalars().all()

    rows: List[CandidateFeatureVector] = []
    for t in tasks:
        for d in dev_profiles:
            vec = extract_developer_task_feature_vector(db, d.id, t.id)
            rows.append(vec)

    return rows


def export_dataset_csv(
    db: Session, project_id: Optional[uuid.UUID] = None
) -> DatasetExportResponse:
    rows = generate_dataset_rows(db, project_id)

    fieldnames = [
        "developer_id",
        "user_name",
        "user_email",
        "task_id",
        "task_title",
        "project_id",
        "project_name",
        "dev_experience_years",
        "dev_availability_status",
        "dev_availability_encoded",
        "dev_performance_score",
        "dev_total_skills_count",
        "dev_workload_score",
        "dev_capacity_hours",
        "dev_active_task_count",
        "dev_workload_status",
        "dev_workload_status_encoded",
        "dev_completion_rate",
        "dev_on_time_rate",
        "dev_weighted_productivity",
        "dev_current_streak",
        "task_estimated_hours",
        "task_complexity",
        "task_complexity_encoded",
        "task_priority",
        "task_priority_encoded",
        "task_status",
        "task_required_skill_count",
        "task_weight_score",
        "matching_skill_count",
        "skill_coverage_ratio",
        "avg_required_level",
        "avg_developer_level",
        "avg_proficiency_gap",
        "min_proficiency_gap",
        "weighted_skill_match_score",
        "is_historically_assigned",
        "label_target",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for r in rows:
        d = r.model_dump()
        d["developer_id"] = str(d["developer_id"])
        d["task_id"] = str(d["task_id"])
        d["project_id"] = str(d["project_id"])
        d["label_target"] = "" if d["label_target"] is None else d["label_target"]
        writer.writerow(d)

    csv_str = output.getvalue()

    return DatasetExportResponse(
        total_rows=len(rows),
        total_features=len(fieldnames) - 3, # excluding IDs & titles
        columns=fieldnames,
        csv_content=csv_str,
        label_disclaimer="Candidate feature vectors generated deterministically from PostgreSQL state. Supervised target labels (label_target) are explicitly set to NULL as ground truth recommendation labels are not yet available.",
    )
