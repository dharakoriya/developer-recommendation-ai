import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.database import get_db
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole, ProjectStatus
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    TeamResponse,
    TeamMemberResponse,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def build_team_member_response(member: TeamMember) -> TeamMemberResponse:
    dev = member.developer_profile
    user = dev.user if dev else None
    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        developer_id=member.developer_id,
        user_name=user.name if user else "Unknown",
        user_email=user.email if user else "",
        experience_years=dev.experience_years if dev else None,
        availability_status=dev.availability_status if dev else None,
        joined_at=member.joined_at,
        left_at=member.left_at,
    )


def build_team_response(team: Team, include_members: bool = True) -> TeamResponse:
    active_members = [m for m in (team.members or []) if m.left_at is None]
    member_responses = [build_team_member_response(m) for m in active_members] if include_members else []
    return TeamResponse(
        id=team.id,
        project_id=team.project_id,
        name=team.name,
        description=team.description,
        created_at=team.created_at,
        updated_at=team.updated_at,
        members_count=len(active_members),
        members=member_responses,
    )


def build_project_response(project: Project, include_teams: bool = True) -> ProjectResponse:
    creator = project.creator
    teams = project.teams or []
    team_responses = [build_team_response(t, include_members=True) for t in teams] if include_teams else []
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_by=project.created_by,
        creator_name=creator.name if creator else "Unknown",
        creator_email=creator.email if creator else "",
        created_at=project.created_at,
        updated_at=project.updated_at,
        teams_count=len(teams),
        teams=team_responses,
    )


@router.get("", response_model=List[ProjectResponse], summary="List all projects")
def list_projects(
    status_filter: Optional[ProjectStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns list of all projects.
    Accessible to all authenticated users (ADMIN, MANAGER, DEVELOPER).
    """
    query = (
        select(Project)
        .options(
            joinedload(Project.creator),
            joinedload(Project.teams).joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user),
        )
        .order_by(Project.created_at.desc())
    )

    if status_filter:
        query = query.where(Project.status == status_filter)

    projects = db.execute(query).unique().scalars().all()
    return [build_project_response(p, include_teams=True) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary="Create a new project")
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new project.
    Requires ADMIN or MANAGER role.
    """
    new_project = Project(
        name=project_in.name,
        description=project_in.description,
        status=project_in.status,
        created_by=current_user.id,
    )
    db.add(new_project)
    db.commit()

    # Query back with relationships
    stmt = (
        select(Project)
        .options(
            joinedload(Project.creator),
            joinedload(Project.teams),
        )
        .where(Project.id == new_project.id)
    )
    project = db.execute(stmt).unique().scalar_one()
    return build_project_response(project, include_teams=True)


@router.get("/{project_id}", response_model=ProjectResponse, summary="Get project details")
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves project details by ID including associated teams and members.
    Accessible to all authenticated users.
    """
    stmt = (
        select(Project)
        .options(
            joinedload(Project.creator),
            joinedload(Project.teams).joinedload(Team.members).joinedload(TeamMember.developer_profile),
        )
        .where(Project.id == project_id)
    )
    project = db.execute(stmt).unique().scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    return build_project_response(project, include_teams=True)


@router.put("/{project_id}", response_model=ProjectResponse, summary="Update project details")
def update_project(
    project_id: uuid.UUID,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates project details and status.
    Requires ADMIN or MANAGER role.
    """
    stmt = (
        select(Project)
        .options(
            joinedload(Project.creator),
            joinedload(Project.teams).joinedload(Team.members).joinedload(TeamMember.developer_profile),
        )
        .where(Project.id == project_id)
    )
    project = db.execute(stmt).unique().scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status

    db.commit()
    db.refresh(project)
    return build_project_response(project, include_teams=True)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project")
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Deletes a project and its associated teams.
    Requires ADMIN or MANAGER role.
    """
    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    db.delete(project)
    db.commit()
    return None
