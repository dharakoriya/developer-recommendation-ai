import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.database import get_db
from app.models.developer import DeveloperProfile, DeveloperSkill
from app.models.user import User
from app.models.skill import Skill
from app.models.enums import UserRole, AvailabilityStatus
from app.schemas.developer import DeveloperCreate, DeveloperUpdate, DeveloperResponse
from app.schemas.skill import DeveloperSkillAssign, DeveloperSkillUpdate, DeveloperSkillResponse
from app.api.deps import get_current_user, require_roles
from app.services.performance_service import calculate_developer_performance_metrics
from app.services.workload_service import calculate_developer_workload_details
from app.services.recommendation_service import invalidate_all_recommendations
from app.services.risk_assessment_service import assess_developer_delivery_risk


router = APIRouter()


def _format_developer_response(dev: DeveloperProfile, db: Optional[Session] = None) -> DeveloperResponse:
    """Helper to convert DeveloperProfile ORM model into DeveloperResponse schema with calculated metrics."""
    skills_list = []
    for ds in dev.developer_skills:
        skills_list.append(
            DeveloperSkillResponse(
                id=ds.id,
                developer_id=ds.developer_id,
                skill_id=ds.skill_id,
                skill_name=ds.skill.name if ds.skill else None,
                skill_category=ds.skill.category if ds.skill else None,
                proficiency_level=ds.proficiency_level,
                created_at=ds.created_at,
                updated_at=ds.updated_at,
            )
        )

    wl_score = None
    wl_status = None
    c_rate = None
    prod_score = None
    active_count = None
    risk_lvl = None

    if db:
        try:
            wl = calculate_developer_workload_details(db, dev.id)
            wl_score = wl.workload_score
            wl_status = wl.workload_status
            active_count = wl.active_task_count

            perf = calculate_developer_performance_metrics(db, dev.id)
            c_rate = perf.get("completion_rate")
            prod_score = perf.get("productivity_score")

            risk = assess_developer_delivery_risk(db, dev.id)
            risk_lvl = risk.get("delivery_risk_level")
        except Exception:
            pass

    return DeveloperResponse(
        id=dev.id,
        user_id=dev.user_id,
        user_name=dev.user.name if dev.user else None,
        user_email=dev.user.email if dev.user else None,
        experience_years=dev.experience_years,
        availability_status=dev.availability_status,
        performance_score=dev.performance_score,
        workload_score=wl_score,
        workload_status=wl_status,
        completion_rate=c_rate,
        productivity_score=prod_score,
        active_task_count=active_count,
        delivery_risk_level=risk_lvl,
        created_at=dev.created_at,
        updated_at=dev.updated_at,
        skills=skills_list,
    )


ALLOWED_SORT_FIELDS = {
    "name": "user_name",
    "experience": "experience_years",
    "performance": "performance_score",
    "workload": "workload_score",
    "availability": "availability_status",
    "task_completion": "completion_rate",
    "completion_rate": "completion_rate",
    "productivity": "productivity_score",
    "productivity_score": "productivity_score",
}


@router.get("", response_model=List[DeveloperResponse], summary="List developer profiles with sorting and filters")
def list_developers(
    performance_tier: Optional[str] = Query(None, description="top_performers, high_performers, average, needs_improvement"),
    min_completion_rate: Optional[float] = Query(None, description="Minimum completion rate percentage (e.g. 50, 75, 90)"),
    availability_status: Optional[AvailabilityStatus] = Query(None, description="AVAILABLE, PARTIAL, UNAVAILABLE"),
    skills: Optional[str] = Query(None, description="Comma-separated skill names"),
    experience_range: Optional[str] = Query(None, description="0-1, 1-3, 3-5, 5+"),
    workload_status: Optional[str] = Query(None, description="available, balanced, high, overloaded"),
    sort_by: Optional[str] = Query("name", description="Sort field: name, experience, performance, workload, availability, task_completion, productivity"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns sorted and filtered developer profiles with user info, workload, performance, and risk intelligence.
    Supported sort fields: name, experience, performance, workload, availability, task_completion, productivity.
    Supported filters: performance_tier, min_completion_rate, availability_status, skills, experience_range, workload_status.
    """
    if sort_by and sort_by.lower() not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort field '{sort_by}'. Allowed fields: {list(ALLOWED_SORT_FIELDS.keys())}",
        )

    order_direction = sort_order.lower() if sort_order and sort_order.lower() in ["asc", "desc"] else "asc"

    query = (
        select(DeveloperProfile)
        .options(
            joinedload(DeveloperProfile.user),
            joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
        )
    )

    if availability_status:
        query = query.where(DeveloperProfile.availability_status == availability_status)

    developers = db.execute(query).unique().scalars().all()
    formatted_list: List[DeveloperResponse] = []

    for dev in developers:
        # Experience range check
        exp = float(dev.experience_years) if dev.experience_years is not None else 0.0
        if experience_range == "0-1" and not (0 <= exp <= 1.0):
            continue
        elif experience_range == "1-3" and not (1.0 < exp <= 3.0):
            continue
        elif experience_range == "3-5" and not (3.0 < exp <= 5.0):
            continue
        elif experience_range == "5+" and not (exp > 5.0):
            continue

        # Skills check
        if skills:
            req_skill_names = [s.strip().lower() for s in skills.split(",") if s.strip()]
            dev_skill_names = [ds.skill.name.lower() for ds in dev.developer_skills if ds.skill]
            if not all(s_req in dev_skill_names for s_req in req_skill_names):
                continue

        resp = _format_developer_response(dev, db=db)

        # Performance Tier filter
        if performance_tier:
            score = float(resp.performance_score or 50.0)
            if performance_tier == "top_performers" and score < 85.0:
                continue
            elif performance_tier == "high_performers" and not (70.0 <= score < 85.0):
                continue
            elif performance_tier == "average" and not (50.0 <= score < 70.0):
                continue
            elif performance_tier == "needs_improvement" and score >= 50.0:
                continue

        # Completion rate filter
        if min_completion_rate is not None:
            c_rate = resp.completion_rate or 0.0
            if c_rate < min_completion_rate:
                continue

        # Workload status filter
        if workload_status:
            w_stat = (resp.workload_status or "").lower()
            if workload_status.lower() not in w_stat:
                continue

        formatted_list.append(resp)

    # Apply sorting safely in memory on formatted responses using validated field key
    sort_key = ALLOWED_SORT_FIELDS.get((sort_by or "name").lower(), "user_name")
    reverse = (order_direction == "desc")

    def extract_sort_val(item: DeveloperResponse):
        val = getattr(item, sort_key, None)
        if val is None:
            return "" if isinstance(val, str) else -999999.0
        if isinstance(val, AvailabilityStatus):
            return val.value
        return val

    formatted_list.sort(key=extract_sort_val, reverse=reverse)

    return formatted_list


@router.post("", response_model=DeveloperResponse, status_code=status.HTTP_201_CREATED, summary="Create developer profile")
def create_developer(
    dev_in: DeveloperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a developer profile for an existing User.
    Requires ADMIN or MANAGER role.
    """
    user = db.execute(select(User).where(User.id == dev_in.user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {dev_in.user_id} not found.",
        )

    existing_profile = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.user_id == dev_in.user_id)
    ).scalar_one_or_none()

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Developer profile already exists for user ID {dev_in.user_id}.",
        )

    new_dev = DeveloperProfile(
        user_id=dev_in.user_id,
        experience_years=dev_in.experience_years,
        availability_status=dev_in.availability_status,
        performance_score=dev_in.performance_score,
    )
    db.add(new_dev)
    db.commit()

    # Query created developer with eager loads
    created_dev = db.execute(
        select(DeveloperProfile)
        .options(
            joinedload(DeveloperProfile.user),
            joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
        )
        .where(DeveloperProfile.id == new_dev.id)
    ).unique().scalar_one()

    return _format_developer_response(created_dev)


@router.get("/{developer_id}", response_model=DeveloperResponse, summary="Get developer profile")
def get_developer(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves developer profile by ID.
    Accessible to all authenticated users.
    """
    dev = db.execute(
        select(DeveloperProfile)
        .options(
            joinedload(DeveloperProfile.user),
            joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
        )
        .where(DeveloperProfile.id == developer_id)
    ).unique().scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    return _format_developer_response(dev)


@router.put("/{developer_id}", response_model=DeveloperResponse, summary="Update developer profile")
def update_developer(
    developer_id: uuid.UUID,
    dev_in: DeveloperUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates developer profile details.
    Permitted for ADMIN, MANAGER, or DEVELOPER updating their own profile.
    """
    dev = db.execute(
        select(DeveloperProfile)
        .options(
            joinedload(DeveloperProfile.user),
            joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
        )
        .where(DeveloperProfile.id == developer_id)
    ).unique().scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    # Permission check: ADMIN, MANAGER, or self
    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER) and dev.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not authorized to update another developer's profile.",
        )

    if dev_in.experience_years is not None:
        dev.experience_years = dev_in.experience_years
    if dev_in.availability_status is not None:
        dev.availability_status = dev_in.availability_status
    if dev_in.performance_score is not None:
        dev.performance_score = dev_in.performance_score

    db.commit()
    db.refresh(dev)
    invalidate_all_recommendations(db)

    return _format_developer_response(dev)


@router.delete("/{developer_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete developer profile")
def delete_developer(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Deletes a developer profile.
    Requires ADMIN or MANAGER role.
    """
    dev = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    db.delete(dev)
    db.commit()
    return None


# --- DEVELOPER SKILLS SUB-RESOURCE ENDPOINTS ---

@router.get("/{developer_id}/skills", response_model=List[DeveloperSkillResponse], summary="Retrieve developer skills")
def get_developer_skills(
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves all skills assigned to a specific developer.
    """
    dev = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    dev_skills = db.execute(
        select(DeveloperSkill)
        .options(joinedload(DeveloperSkill.skill))
        .where(DeveloperSkill.developer_id == developer_id)
    ).scalars().all()

    return [
        DeveloperSkillResponse(
            id=ds.id,
            developer_id=ds.developer_id,
            skill_id=ds.skill_id,
            skill_name=ds.skill.name if ds.skill else None,
            skill_category=ds.skill.category if ds.skill else None,
            proficiency_level=ds.proficiency_level,
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )
        for ds in dev_skills
    ]


@router.post("/{developer_id}/skills", response_model=DeveloperSkillResponse, status_code=status.HTTP_201_CREATED, summary="Assign skill to developer")
def assign_developer_skill(
    developer_id: uuid.UUID,
    skill_assign: DeveloperSkillAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assigns a skill to a developer with proficiency level (0..100).
    Permitted for ADMIN, MANAGER, or DEVELOPER modifying their own profile skills.
    """
    dev = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER) and dev.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only assign skills to your own profile.",
        )

    skill = db.execute(select(Skill).where(Skill.id == skill_assign.skill_id)).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_assign.skill_id} not found.",
        )

    existing_ds = db.execute(
        select(DeveloperSkill).where(
            DeveloperSkill.developer_id == developer_id,
            DeveloperSkill.skill_id == skill_assign.skill_id,
        )
    ).scalar_one_or_none()

    if existing_ds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill is already assigned to this developer. Use PUT to update proficiency.",
        )

    new_ds = DeveloperSkill(
        developer_id=developer_id,
        skill_id=skill_assign.skill_id,
        proficiency_level=skill_assign.proficiency_level,
    )
    db.add(new_ds)
    db.commit()

    created_ds = db.execute(
        select(DeveloperSkill)
        .options(joinedload(DeveloperSkill.skill))
        .where(DeveloperSkill.id == new_ds.id)
    ).scalar_one()

    invalidate_all_recommendations(db)

    return DeveloperSkillResponse(
        id=created_ds.id,
        developer_id=created_ds.developer_id,
        skill_id=created_ds.skill_id,
        skill_name=created_ds.skill.name if created_ds.skill else None,
        skill_category=created_ds.skill.category if created_ds.skill else None,
        proficiency_level=created_ds.proficiency_level,
        created_at=created_ds.created_at,
        updated_at=created_ds.updated_at,
    )


@router.put("/{developer_id}/skills/{skill_id}", response_model=DeveloperSkillResponse, summary="Update developer skill proficiency")
def update_developer_skill(
    developer_id: uuid.UUID,
    skill_id: uuid.UUID,
    skill_update: DeveloperSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates proficiency level (0..100) of an assigned developer skill.
    """
    dev = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER) and dev.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only update skills on your own profile.",
        )

    ds = db.execute(
        select(DeveloperSkill)
        .options(joinedload(DeveloperSkill.skill))
        .where(
            DeveloperSkill.developer_id == developer_id,
            DeveloperSkill.skill_id == skill_id,
        )
    ).scalar_one_or_none()

    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer skill mapping for skill ID {skill_id} not found on this developer profile.",
        )

    ds.proficiency_level = skill_update.proficiency_level
    db.commit()
    db.refresh(ds)
    invalidate_all_recommendations(db)

    return DeveloperSkillResponse(
        id=ds.id,
        developer_id=ds.developer_id,
        skill_id=ds.skill_id,
        skill_name=ds.skill.name if ds.skill else None,
        skill_category=ds.skill.category if ds.skill else None,
        proficiency_level=ds.proficiency_level,
        created_at=ds.created_at,
        updated_at=ds.updated_at,
    )


@router.delete("/{developer_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove skill from developer")
def remove_developer_skill(
    developer_id: uuid.UUID,
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Removes a skill association from a developer profile.
    """
    dev = db.execute(
        select(DeveloperProfile).where(DeveloperProfile.id == developer_id)
    ).scalar_one_or_none()

    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {developer_id} not found.",
        )

    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER) and dev.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only remove skills from your own profile.",
        )

    ds = db.execute(
        select(DeveloperSkill).where(
            DeveloperSkill.developer_id == developer_id,
            DeveloperSkill.skill_id == skill_id,
        )
    ).scalar_one_or_none()

    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer skill mapping for skill ID {skill_id} not found on this developer profile.",
        )

    db.delete(ds)
    db.commit()
    invalidate_all_recommendations(db)
    return None
