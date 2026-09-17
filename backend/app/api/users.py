import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.developer import DeveloperProfile, DeveloperSkill
from app.models.skill import Skill
from app.models.enums import UserRole, AvailabilityStatus
from app.schemas.user import (
    UserAdminCreate,
    UserAdminUpdate,
    UserStatusToggle,
    UserResetPassword,
    UserAdminResponse,
    UserSummaryResponse,
)
from app.api.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.api.developers import _format_developer_response

router = APIRouter()


def _build_user_response(user: User, db: Session) -> UserAdminResponse:
    dev_resp = None
    if user.developer_profile:
        # Eager load developer skills for proper response formatting
        dev_profile = db.execute(
            select(DeveloperProfile)
            .options(
                joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
                joinedload(DeveloperProfile.user),
            )
            .where(DeveloperProfile.id == user.developer_profile.id)
        ).unique().scalar_one_or_none()
        if dev_profile:
            dev_resp = _format_developer_response(dev_profile, db=db)

    return UserAdminResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        developer_profile=dev_resp,
    )


@router.get("", response_model=UserSummaryResponse, summary="List all system users (Admin only)")
def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role (ADMIN, MANAGER, DEVELOPER)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Retrieves system users with aggregate counts.
    Strictly restricted to users with ADMIN role.
    """
    query = select(User).options(
        joinedload(User.developer_profile).joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill)
    )

    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.name).like(search_pattern) | func.lower(User.email).like(search_pattern)
        )

    users = db.execute(query.order_by(User.created_at.desc())).unique().scalars().all()

    # Aggregate counts across all users
    all_users = db.execute(select(User)).scalars().all()
    total = len(all_users)
    active = sum(1 for u in all_users if u.is_active)
    inactive = total - active
    admins = sum(1 for u in all_users if u.role == UserRole.ADMIN)
    managers = sum(1 for u in all_users if u.role == UserRole.MANAGER)
    developers = sum(1 for u in all_users if u.role == UserRole.DEVELOPER)

    formatted_users = [_build_user_response(u, db) for u in users]

    return UserSummaryResponse(
        total_users=total,
        active_users=active,
        inactive_users=inactive,
        admin_count=admins,
        manager_count=managers,
        developer_count=developers,
        users=formatted_users,
    )


@router.post("", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED, summary="Create a new user (Admin only)")
def create_user(
    user_in: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Provisions a new system user (Developer, Manager, or Admin).
    If role is DEVELOPER, automatically provisions their DeveloperProfile.
    """
    clean_email = user_in.email.strip().lower()

    existing_user = db.execute(
        select(User).where(func.lower(User.email) == clean_email)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{clean_email}' already exists in DEVAlign AI.",
        )

    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name.strip(),
        email=clean_email,
        password_hash=hashed_password,
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If role is DEVELOPER, create associated DeveloperProfile
    if user_in.role == UserRole.DEVELOPER:
        dev_profile = DeveloperProfile(
            user_id=new_user.id,
            experience_years=user_in.experience_years or Decimal("2.0"),
            availability_status=user_in.availability_status or AvailabilityStatus.AVAILABLE,
            performance_score=Decimal("75.0"),
        )
        db.add(dev_profile)
        db.commit()
        db.refresh(dev_profile)

        # Assign initial skills if provided
        if user_in.initial_skills:
            for skill_id in user_in.initial_skills:
                skill_obj = db.execute(select(Skill).where(Skill.id == skill_id)).scalar_one_or_none()
                if skill_obj:
                    ds = DeveloperSkill(
                        developer_id=dev_profile.id,
                        skill_id=skill_id,
                        proficiency_level=Decimal("70.0"),
                    )
                    db.add(ds)
            db.commit()

    db.refresh(new_user)
    return _build_user_response(new_user, db)


@router.get("/{user_id}", response_model=UserAdminResponse, summary="Get user details by ID (Admin only)")
def get_user_detail(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Retrieves full details of a specific user including DeveloperProfile.
    """
    user = db.execute(
        select(User)
        .options(
            joinedload(User.developer_profile).joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill)
        )
        .where(User.id == user_id)
    ).unique().scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    return _build_user_response(user, db)


@router.put("/{user_id}", response_model=UserAdminResponse, summary="Update user profile and role (Admin only)")
def update_user(
    user_id: uuid.UUID,
    user_in: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Updates user account attributes (name, email, role, is_active).
    Prevents deactivating the only active Admin or self-deactivation.
    """
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    # Safety guard: Prevent deactivating currently logged in admin user
    if user_in.is_active is False and user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrative account.",
        )

    # Safety guard: Prevent deactivating or demoting the last active admin
    if (user_in.is_active is False or (user_in.role and user_in.role != UserRole.ADMIN)) and user.role == UserRole.ADMIN:
        active_admins = db.execute(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active == True)
        ).scalar() or 0
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate or demote the system's only active Administrator.",
            )

    if user_in.email:
        clean_email = user_in.email.strip().lower()
        if clean_email != user.email.lower():
            existing = db.execute(
                select(User).where(func.lower(User.email) == clean_email, User.id != user.id)
            ).scalar_one_or_none()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{clean_email}' is already in use by another user.",
                )
            user.email = clean_email

    if user_in.name:
        user.name = user_in.name.strip()

    if user_in.role is not None and user_in.role != user.role:
        prev_role = user.role
        user.role = user_in.role
        # If changing to DEVELOPER and no profile exists, create it
        if user_in.role == UserRole.DEVELOPER and not user.developer_profile:
            dev_profile = DeveloperProfile(
                user_id=user.id,
                experience_years=Decimal("2.0"),
                availability_status=AvailabilityStatus.AVAILABLE,
                performance_score=Decimal("75.0"),
            )
            db.add(dev_profile)

    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    db.commit()
    db.refresh(user)
    return _build_user_response(user, db)


@router.patch("/{user_id}/status", response_model=UserAdminResponse, summary="Toggle user active/inactive status (Admin only)")
def toggle_user_status(
    user_id: uuid.UUID,
    status_in: UserStatusToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Activates or deactivates a user account.
    """
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    if status_in.is_active is False and user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrative account.",
        )

    if status_in.is_active is False and user.role == UserRole.ADMIN:
        active_admins = db.execute(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active == True)
        ).scalar() or 0
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the system's only active Administrator.",
            )

    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)
    return _build_user_response(user, db)


@router.post("/{user_id}/reset-password", summary="Reset user password (Admin only)")
def reset_user_password(
    user_id: uuid.UUID,
    reset_in: UserResetPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Resets a user's password to a new value.
    """
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    user.password_hash = get_password_hash(reset_in.new_password)
    db.commit()

    return {"message": f"Password for user '{user.email}' has been successfully reset."}
