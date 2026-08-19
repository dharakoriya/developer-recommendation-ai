import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.database import get_db
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.project import (
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamMemberAdd,
    TeamMemberResponse,
)
from app.api.deps import get_current_user, require_roles
from app.api.projects import build_team_response, build_team_member_response

router = APIRouter()


# Project-nested team routes
@router.get("/projects/{project_id}/teams", response_model=List[TeamResponse], summary="List teams in project")
def list_teams_for_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all teams belonging to a specific project.
    Accessible to all authenticated users.
    """
    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    stmt = (
        select(Team)
        .options(
            joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user)
        )
        .where(Team.project_id == project_id)
        .order_by(Team.created_at.asc())
    )
    teams = db.execute(stmt).unique().scalars().all()
    return [build_team_response(t, include_members=True) for t in teams]


@router.post("/projects/{project_id}/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED, summary="Create a team in project")
def create_team(
    project_id: uuid.UUID,
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new team under a project.
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

    new_team = Team(
        project_id=project_id,
        name=team_in.name,
        description=team_in.description,
    )
    db.add(new_team)
    db.commit()

    stmt = (
        select(Team)
        .options(joinedload(Team.members))
        .where(Team.id == new_team.id)
    )
    team = db.execute(stmt).unique().scalar_one()
    return build_team_response(team, include_members=True)


# Direct Team routes
@router.get("/teams/{team_id}", response_model=TeamResponse, summary="Get team details")
def get_team(
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves team details including active team members.
    Accessible to all authenticated users.
    """
    stmt = (
        select(Team)
        .options(
            joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user)
        )
        .where(Team.id == team_id)
    )
    team = db.execute(stmt).unique().scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    return build_team_response(team, include_members=True)


@router.put("/teams/{team_id}", response_model=TeamResponse, summary="Update team details")
def update_team(
    team_id: uuid.UUID,
    team_in: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Updates team information.
    Requires ADMIN or MANAGER role.
    """
    stmt = (
        select(Team)
        .options(
            joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user)
        )
        .where(Team.id == team_id)
    )
    team = db.execute(stmt).unique().scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    if team_in.name is not None:
        team.name = team_in.name
    if team_in.description is not None:
        team.description = team_in.description

    db.commit()
    db.refresh(team)
    return build_team_response(team, include_members=True)


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete team")
def delete_team(
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Deletes a team.
    Requires ADMIN or MANAGER role.
    """
    team = db.execute(
        select(Team).where(Team.id == team_id)
    ).scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    db.delete(team)
    db.commit()
    return None


# Team Members management routes
@router.get("/teams/{team_id}/members", response_model=List[TeamMemberResponse], summary="List active team members")
def list_team_members(
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists active members belonging to a team.
    Accessible to all authenticated users.
    """
    team = db.execute(
        select(Team).where(Team.id == team_id)
    ).scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    stmt = (
        select(TeamMember)
        .options(
            joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user)
        )
        .where(TeamMember.team_id == team_id, TeamMember.left_at.is_(None))
        .order_by(TeamMember.joined_at.asc())
    )
    members = db.execute(stmt).scalars().all()
    return [build_team_member_response(m) for m in members]


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED, summary="Add developer to team")
def add_team_member(
    team_id: uuid.UUID,
    member_in: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Adds a developer profile to a team.
    Requires ADMIN or MANAGER role.
    Prevents adding the same developer to the team twice active.
    """
    team = db.execute(
        select(Team).where(Team.id == team_id)
    ).scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    dev_profile = db.execute(
        select(DeveloperProfile)
        .options(joinedload(DeveloperProfile.user))
        .where(DeveloperProfile.id == member_in.developer_id)
    ).scalar_one_or_none()

    if not dev_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Developer profile with ID {member_in.developer_id} not found.",
        )

    # Check if developer is already an active member of this team
    existing_active = db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.developer_id == member_in.developer_id,
            TeamMember.left_at.is_(None),
        )
    ).scalar_one_or_none()

    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Developer is already an active member of this team.",
        )

    new_member = TeamMember(
        team_id=team_id,
        developer_id=member_in.developer_id,
    )
    db.add(new_member)
    db.commit()

    stmt = (
        select(TeamMember)
        .options(joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user))
        .where(TeamMember.id == new_member.id)
    )
    member = db.execute(stmt).scalar_one()
    return build_team_member_response(member)


@router.delete("/teams/{team_id}/members/{developer_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove developer from team")
def remove_team_member(
    team_id: uuid.UUID,
    developer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Removes a developer from a team by setting left_at timestamp.
    Requires ADMIN or MANAGER role.
    """
    team = db.execute(
        select(Team).where(Team.id == team_id)
    ).scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found.",
        )

    member = db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.developer_id == developer_id,
            TeamMember.left_at.is_(None),
        )
    ).scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active membership for developer ID {developer_id} in team ID {team_id} not found.",
        )

    member.left_at = func.now()
    db.commit()
    return None
