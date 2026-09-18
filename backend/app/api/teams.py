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
from app.schemas.user import UserSummaryResponse, UserAdminResponse


def check_team_manager_access(team: Team, current_user: User):
    if current_user.role == UserRole.MANAGER:
        if not team.manager_id or team.manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to manage this team.",
            )


def check_team_read_access(team: Team, current_user: User, db: Session):
    if current_user.role == UserRole.ADMIN:
        return
    elif current_user.role == UserRole.MANAGER:
        if not team.manager_id or team.manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this team.",
            )
    elif current_user.role == UserRole.DEVELOPER:
        dev_profile = db.execute(
            select(DeveloperProfile).where(DeveloperProfile.user_id == current_user.id)
        ).scalar_one_or_none()
        if not dev_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this team.",
            )
        is_member = db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team.id,
                TeamMember.developer_id == dev_profile.id,
                TeamMember.left_at.is_(None),
            )
        ).scalar_one_or_none()
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this team.",
            )

router = APIRouter()

@router.get("/managers", summary="List all managers")
def list_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all users with the MANAGER role.
    Accessible to all authenticated users for team creation/editing.
    """
    managers = db.execute(select(User).where(User.role == UserRole.MANAGER, User.is_active == True)).scalars().all()
    return [{"id": str(m.id), "name": m.name, "email": m.email} for m in managers]


# Direct Team routes
@router.get("/teams", response_model=List[TeamResponse], summary="List all teams")
def list_all_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists teams across projects.
    - ADMIN: Lists all teams.
    - MANAGER: Lists only teams assigned to the current manager.
    - DEVELOPER: Lists only teams where the developer is an active member.
    """
    stmt = (
        select(Team)
        .options(
            joinedload(Team.project),
            joinedload(Team.manager),
            joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Team.tasks),
        )
    )
    if current_user.role == UserRole.MANAGER:
        stmt = stmt.where(Team.manager_id == current_user.id)
    elif current_user.role == UserRole.DEVELOPER:
        dev_profile = db.execute(
            select(DeveloperProfile).where(DeveloperProfile.user_id == current_user.id)
        ).scalar_one_or_none()
        if not dev_profile:
            return []
        team_ids_subquery = select(TeamMember.team_id).where(
            TeamMember.developer_id == dev_profile.id,
            TeamMember.left_at.is_(None),
        )
        stmt = stmt.where(Team.id.in_(team_ids_subquery))

    stmt = stmt.order_by(Team.created_at.asc())
    teams = db.execute(stmt).unique().scalars().all()
    return [build_team_response(t, include_members=True) for t in teams]


@router.post("/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED, summary="Create a team directly")
def create_team_direct(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Creates a new team directly with project_id specified in team_in.
    Requires ADMIN or MANAGER role.
    """
    if not team_in.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required to create a team.",
        )
    return create_team(project_id=team_in.project_id, team_in=team_in, db=db, current_user=current_user)


# Project-nested team routes
@router.get("/projects/{project_id}/teams", response_model=List[TeamResponse], summary="List teams in project")
def list_teams_for_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists teams belonging to a specific project.
    - ADMIN: Lists all teams in the project.
    - MANAGER: Lists only teams in the project assigned to the current manager.
    - DEVELOPER: Lists only teams in the project where the developer is an active member.
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
            joinedload(Team.manager),
            joinedload(Team.members).joinedload(TeamMember.developer_profile).joinedload(DeveloperProfile.user)
        )
        .where(Team.project_id == project_id)
    )
    if current_user.role == UserRole.MANAGER:
        stmt = stmt.where(Team.manager_id == current_user.id)
    elif current_user.role == UserRole.DEVELOPER:
        dev_profile = db.execute(
            select(DeveloperProfile).where(DeveloperProfile.user_id == current_user.id)
        ).scalar_one_or_none()
        if not dev_profile:
            return []
        team_ids_subquery = select(TeamMember.team_id).where(
            TeamMember.developer_id == dev_profile.id,
            TeamMember.left_at.is_(None),
        )
        stmt = stmt.where(Team.id.in_(team_ids_subquery))

    stmt = stmt.order_by(Team.created_at.asc())
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
    - ADMIN: Can assign any manager or leave unassigned.
    - MANAGER: Automatically assigns current manager to the team.
    """
    project = db.execute(
        select(Project).where(Project.id == project_id)
    ).scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found.",
        )

    assigned_manager_id = team_in.manager_id
    if current_user.role == UserRole.MANAGER:
        # Managers always own the teams they create
        assigned_manager_id = current_user.id
    elif assigned_manager_id:
        manager = db.execute(select(User).where(User.id == assigned_manager_id, User.role == UserRole.MANAGER)).scalar_one_or_none()
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Manager with ID {assigned_manager_id} not found or is not a manager.",
            )

    new_team = Team(
        project_id=project_id,
        name=team_in.name,
        description=team_in.description,
        manager_id=assigned_manager_id,
    )
    db.add(new_team)
    db.commit()

    stmt = (
        select(Team)
        .options(joinedload(Team.manager),
            joinedload(Team.members))
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
            joinedload(Team.manager),
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

    check_team_read_access(team, current_user, db)

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
    - ADMIN: Can update name, description, and assign/reassign manager.
    - MANAGER: Can only update name and description of their owned team. Reassigning manager is forbidden.
    """
    stmt = (
        select(Team)
        .options(
            joinedload(Team.manager),
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

    check_team_manager_access(team, current_user)

    if team_in.name is not None:
        team.name = team_in.name
    if team_in.description is not None:
        team.description = team_in.description
    if team_in.manager_id is not None:
        if current_user.role != UserRole.ADMIN:
            if team_in.manager_id != team.manager_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only administrators can assign or reassign team managers.",
                )
        else:
            manager = db.execute(select(User).where(User.id == team_in.manager_id, User.role == UserRole.MANAGER)).scalar_one_or_none()
            if not manager:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Manager with ID {team_in.manager_id} not found or is not a manager.",
                )
            team.manager_id = team_in.manager_id

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

    check_team_manager_access(team, current_user)

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

    check_team_read_access(team, current_user, db)

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

    check_team_manager_access(team, current_user)

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

    check_team_manager_access(team, current_user)

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
