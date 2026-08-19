import uuid
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.developer import DeveloperProfile, WorkloadRecord
from app.models.task import Task, TaskSkill, Assignment
from app.models.enums import TaskComplexity, AvailabilityStatus, AssignmentStatus
from app.schemas.workload import (
    WorkloadSummaryItem,
    WorkloadSummaryResponse,
    DeveloperWorkloadDetailResponse,
    WorkloadRecordResponse,
)
from app.api.tasks import build_task_response

COMPLEXITY_WEIGHTS = {
    TaskComplexity.LOW: Decimal("1.0"),
    TaskComplexity.MEDIUM: Decimal("1.15"),
    TaskComplexity.HIGH: Decimal("1.3"),
}

AVAILABILITY_FACTORS = {
    AvailabilityStatus.AVAILABLE: Decimal("1.0"),
    AvailabilityStatus.PARTIAL: Decimal("0.5"),
    AvailabilityStatus.UNAVAILABLE: Decimal("0.05"),
}

STANDARD_CAPACITY_HOURS = Decimal("40.0")


def classify_workload_status(score: Decimal) -> str:
    if score < Decimal("50.0"):
        return "AVAILABLE"
    elif Decimal("50.0") <= score <= Decimal("80.0"):
        return "BALANCED"
    elif Decimal("80.0") < score <= Decimal("100.0"):
        return "HIGH"
    else:
        return "OVERLOADED"


def calculate_developer_workload_details(
    db: Session, developer_id: uuid.UUID
) -> DeveloperWorkloadDetailResponse:
    stmt = (
        select(DeveloperProfile)
        .options(joinedload(DeveloperProfile.user))
        .where(DeveloperProfile.id == developer_id)
    )
    dev_profile = db.execute(stmt).scalar_one_or_none()

    if not dev_profile:
        raise ValueError(f"Developer profile with ID {developer_id} not found.")

    # Get active assignments
    assign_stmt = (
        select(Assignment)
        .options(
            joinedload(Assignment.task).joinedload(Task.project),
            joinedload(Assignment.task).joinedload(Task.team),
            joinedload(Assignment.task).joinedload(Task.creator),
            joinedload(Assignment.task).joinedload(Task.task_skills).joinedload(TaskSkill.skill),
            joinedload(Assignment.task).joinedload(Task.assignments).joinedload(Assignment.developer_profile),
        )
        .where(
            Assignment.developer_id == developer_id,
            Assignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_assignments = db.execute(assign_stmt).unique().scalars().all()

    active_tasks = [a.task for a in active_assignments if a.task]
    active_task_count = len(active_tasks)

    total_est_hours = sum(
        (t.estimated_hours for t in active_tasks), start=Decimal("0.0")
    )
    weighted_hours = sum(
        (t.estimated_hours * COMPLEXITY_WEIGHTS.get(t.complexity, Decimal("1.0")) for t in active_tasks),
        start=Decimal("0.0"),
    )

    avail_factor = AVAILABILITY_FACTORS.get(
        dev_profile.availability_status, Decimal("1.0")
    )
    capacity_hours = STANDARD_CAPACITY_HOURS * avail_factor

    if capacity_hours <= Decimal("0.0"):
        workload_score = Decimal("999.99")
    else:
        workload_score = round((weighted_hours / capacity_hours) * Decimal("100.0"), 2)

    workload_status = classify_workload_status(workload_score)

    # Get latest workload record timestamp
    last_record = db.execute(
        select(WorkloadRecord)
        .where(WorkloadRecord.developer_id == developer_id)
        .order_by(WorkloadRecord.calculated_at.desc())
    ).scalars().first()

    last_snapshot_at = last_record.calculated_at if last_record else None
    task_responses = [build_task_response(t) for t in active_tasks]

    return DeveloperWorkloadDetailResponse(
        developer_id=dev_profile.id,
        user_id=dev_profile.user_id,
        user_name=dev_profile.user.name if dev_profile.user else "Unknown",
        user_email=dev_profile.user.email if dev_profile.user else "",
        experience_years=dev_profile.experience_years,
        availability_status=dev_profile.availability_status,
        active_task_count=active_task_count,
        total_estimated_hours=total_est_hours,
        weighted_hours=weighted_hours,
        capacity_hours=capacity_hours,
        workload_score=workload_score,
        workload_status=workload_status,
        active_tasks=task_responses,
        last_snapshot_at=last_snapshot_at,
    )


def get_system_workload_summary(db: Session) -> WorkloadSummaryResponse:
    devs_stmt = select(DeveloperProfile).options(joinedload(DeveloperProfile.user))
    dev_profiles = db.execute(devs_stmt).scalars().all()

    summary_items: List[WorkloadSummaryItem] = []
    available_count = 0
    balanced_count = 0
    high_count = 0
    overloaded_count = 0
    total_score_sum = Decimal("0.0")

    for dev in dev_profiles:
        details = calculate_developer_workload_details(db, dev.id)

        item = WorkloadSummaryItem(
            developer_id=details.developer_id,
            user_id=details.user_id,
            user_name=details.user_name,
            user_email=details.user_email,
            experience_years=details.experience_years,
            availability_status=details.availability_status,
            active_task_count=details.active_task_count,
            total_estimated_hours=details.total_estimated_hours,
            weighted_hours=details.weighted_hours,
            capacity_hours=details.capacity_hours,
            workload_score=details.workload_score,
            workload_status=details.workload_status,
        )
        summary_items.append(item)
        total_score_sum += details.workload_score

        if details.workload_status == "AVAILABLE":
            available_count += 1
        elif details.workload_status == "BALANCED":
            balanced_count += 1
        elif details.workload_status == "HIGH":
            high_count += 1
        elif details.workload_status == "OVERLOADED":
            overloaded_count += 1

    total_devs = len(dev_profiles)
    avg_score = (
        round(total_score_sum / Decimal(total_devs), 2)
        if total_devs > 0
        else Decimal("0.0")
    )

    return WorkloadSummaryResponse(
        total_developers=total_devs,
        available_developers_count=available_count,
        balanced_developers_count=balanced_count,
        high_workload_count=high_count,
        overloaded_developers_count=overloaded_count,
        average_workload_score=avg_score,
        developers=summary_items,
    )


def create_workload_snapshot(
    db: Session, developer_id: uuid.UUID
) -> WorkloadRecordResponse:
    details = calculate_developer_workload_details(db, developer_id)
    avail_factor = AVAILABILITY_FACTORS.get(
        details.availability_status, Decimal("1.0")
    )

    new_record = WorkloadRecord(
        developer_id=developer_id,
        workload_score=details.workload_score,
        active_task_count=details.active_task_count,
        estimated_hours=details.total_estimated_hours,
        availability_factor=avail_factor,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return WorkloadRecordResponse(
        id=new_record.id,
        developer_id=new_record.developer_id,
        workload_score=new_record.workload_score,
        active_task_count=new_record.active_task_count,
        estimated_hours=new_record.estimated_hours,
        availability_factor=new_record.availability_factor,
        calculated_at=new_record.calculated_at,
    )


def get_developer_workload_history(
    db: Session, developer_id: uuid.UUID
) -> List[WorkloadRecordResponse]:
    stmt = (
        select(WorkloadRecord)
        .where(WorkloadRecord.developer_id == developer_id)
        .order_by(WorkloadRecord.calculated_at.desc())
    )
    records = db.execute(stmt).scalars().all()
    return [
        WorkloadRecordResponse(
            id=r.id,
            developer_id=r.developer_id,
            workload_score=r.workload_score,
            active_task_count=r.active_task_count,
            estimated_hours=r.estimated_hours,
            availability_factor=r.availability_factor,
            calculated_at=r.calculated_at,
        )
        for r in records
    ]
