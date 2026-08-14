import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.skill import Skill
from app.models.enums import UserRole
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=List[SkillResponse], summary="List master skills catalog")
def list_skills(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns all technical skills in the master catalog.
    Accessible to all authenticated users.
    """
    skills = db.execute(select(Skill).order_by(Skill.name)).scalars().all()
    return skills


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED, summary="Create a new skill")
def create_skill(
    skill_in: SkillCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new skill in the master catalog.
    Requires ADMIN or MANAGER role.
    """
    existing_skill = db.execute(
        select(Skill).where(Skill.name.ilike(skill_in.name))
    ).scalar_one_or_none()

    if existing_skill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skill with name '{skill_in.name}' already exists.",
        )

    new_skill = Skill(
        name=skill_in.name,
        category=skill_in.category,
    )
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill


@router.get("/{skill_id}", response_model=SkillResponse, summary="Get skill details")
def get_skill(
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieves a single skill by ID.
    Accessible to all authenticated users.
    """
    skill = db.execute(select(Skill).where(Skill.id == skill_id)).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found.",
        )
    return skill


@router.put("/{skill_id}", response_model=SkillResponse, summary="Update skill details")
def update_skill(
    skill_id: uuid.UUID,
    skill_in: SkillUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates skill details.
    Requires ADMIN or MANAGER role.
    """
    skill = db.execute(select(Skill).where(Skill.id == skill_id)).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found.",
        )

    if skill_in.name is not None and skill_in.name.lower() != skill.name.lower():
        existing = db.execute(
            select(Skill).where(Skill.name.ilike(skill_in.name))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill with name '{skill_in.name}' already exists.",
            )
        skill.name = skill_in.name

    if skill_in.category is not None:
        skill.category = skill_in.category

    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete skill")
def delete_skill(
    skill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Deletes a skill from the master catalog.
    Requires ADMIN or MANAGER role.
    """
    skill = db.execute(select(Skill).where(Skill.id == skill_id)).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {skill_id} not found.",
        )

    db.delete(skill)
    db.commit()
    return None
