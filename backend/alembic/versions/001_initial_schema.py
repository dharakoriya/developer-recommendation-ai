"""Initial Database Schema Migration for DevAlign AI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-14 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enum Types
    user_role_enum = postgresql.ENUM('ADMIN', 'MANAGER', 'DEVELOPER', name='user_role_enum')
    user_role_enum.create(op.get_bind(), checkfirst=True)

    availability_status_enum = postgresql.ENUM('AVAILABLE', 'PARTIAL', 'UNAVAILABLE', name='availability_status_enum')
    availability_status_enum.create(op.get_bind(), checkfirst=True)

    project_status_enum = postgresql.ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED', name='project_status_enum')
    project_status_enum.create(op.get_bind(), checkfirst=True)

    task_priority_enum = postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='task_priority_enum')
    task_priority_enum.create(op.get_bind(), checkfirst=True)

    task_complexity_enum = postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', name='task_complexity_enum')
    task_complexity_enum.create(op.get_bind(), checkfirst=True)

    task_status_enum = postgresql.ENUM('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED', name='task_status_enum')
    task_status_enum.create(op.get_bind(), checkfirst=True)

    assignment_status_enum = postgresql.ENUM('ACTIVE', 'COMPLETED', 'REASSIGNED', 'CANCELLED', name='assignment_status_enum')
    assignment_status_enum.create(op.get_bind(), checkfirst=True)

    shap_direction_enum = postgresql.ENUM('POSITIVE', 'NEGATIVE', name='shap_direction_enum')
    shap_direction_enum.create(op.get_bind(), checkfirst=True)

    # 1. users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'MANAGER', 'DEVELOPER', name='user_role_enum'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('email', name='uq_users_email')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. developer_profiles
    op.create_table(
        'developer_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('experience_years', sa.Numeric(precision=4, scale=1), nullable=False),
        sa.Column('availability_status', sa.Enum('AVAILABLE', 'PARTIAL', 'UNAVAILABLE', name='availability_status_enum'), nullable=False),
        sa.Column('performance_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_developer_profiles_user_id')
    )
    op.create_index('ix_developer_profiles_user_id', 'developer_profiles', ['user_id'], unique=True)

    # 3. skills
    op.create_table(
        'skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('name', name='uq_skills_name')
    )

    # 4. developer_skills
    op.create_table(
        'developer_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proficiency_level', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('developer_id', 'skill_id', name='uq_developer_skill'),
        sa.CheckConstraint('proficiency_level >= 0 AND proficiency_level <= 100', name='ck_developer_skill_proficiency')
    )
    op.create_index('ix_developer_skills_developer_id', 'developer_skills', ['developer_id'])
    op.create_index('ix_developer_skills_skill_id', 'developer_skills', ['skill_id'])

    # 5. projects
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'COMPLETED', 'ARCHIVED', name='project_status_enum'), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_projects_created_by', 'projects', ['created_by'])

    # 6. teams
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_teams_project_id', 'teams', ['project_id'])

    # 7. team_members
    op.create_table(
        'team_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_developer_id', 'team_members', ['developer_id'])

    # 8. tasks
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='task_priority_enum'), nullable=False),
        sa.Column('complexity', sa.Enum('LOW', 'MEDIUM', 'HIGH', name='task_complexity_enum'), nullable=False),
        sa.Column('estimated_hours', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED', name='task_status_enum'), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('estimated_hours > 0', name='ck_task_estimated_hours_positive')
    )
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_team_id', 'tasks', ['team_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_deadline', 'tasks', ['deadline'])

    # 9. task_skills
    op.create_table(
        'task_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('required_level', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('task_id', 'skill_id', name='uq_task_skill'),
        sa.CheckConstraint('required_level >= 0 AND required_level <= 100', name='ck_task_skill_required_level')
    )
    op.create_index('ix_task_skills_task_id', 'task_skills', ['task_id'])
    op.create_index('ix_task_skills_skill_id', 'task_skills', ['skill_id'])

    # 10. assignments
    op.create_table(
        'assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'COMPLETED', 'REASSIGNED', 'CANCELLED', name='assignment_status_enum'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reassigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True)
    )
    op.create_index('ix_assignments_task_id', 'assignments', ['task_id'])
    op.create_index('ix_assignments_developer_id', 'assignments', ['developer_id'])
    op.create_index('ix_assignments_status', 'assignments', ['status'])

    # 11. recommendations
    op.create_table(
        'recommendations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('score', sa.Numeric(precision=7, scale=6), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_recommendations_task_id', 'recommendations', ['task_id'])
    op.create_index('ix_recommendations_developer_id', 'recommendations', ['developer_id'])

    # 12. recommendation_explanations
    op.create_table(
        'recommendation_explanations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('recommendation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recommendations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('feature_name', sa.String(length=100), nullable=False),
        sa.Column('feature_value', sa.Text(), nullable=True),
        sa.Column('shap_value', sa.Numeric(precision=12, scale=8), nullable=False),
        sa.Column('direction', sa.Enum('POSITIVE', 'NEGATIVE', name='shap_direction_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_recommendation_explanations_recommendation_id', 'recommendation_explanations', ['recommendation_id'])

    # 13. workload_records
    op.create_table(
        'workload_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workload_score', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('active_task_count', sa.Integer(), nullable=False),
        sa.Column('estimated_hours', sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column('availability_factor', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_workload_records_developer_id', 'workload_records', ['developer_id'])
    op.create_index('ix_workload_records_calculated_at', 'workload_records', ['calculated_at'])


def downgrade() -> None:
    op.drop_table('workload_records')
    op.drop_table('recommendation_explanations')
    op.drop_table('recommendations')
    op.drop_table('assignments')
    op.drop_table('task_skills')
    op.drop_table('tasks')
    op.drop_table('team_members')
    op.drop_table('teams')
    op.drop_table('projects')
    op.drop_table('developer_skills')
    op.drop_table('skills')
    op.drop_table('developer_profiles')
    op.drop_table('users')

    # Drop enums
    bind = op.get_bind()
    postgresql.ENUM(name='shap_direction_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='assignment_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='task_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='task_complexity_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='task_priority_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='project_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='availability_status_enum').drop(bind, checkfirst=True)
    postgresql.ENUM(name='user_role_enum').drop(bind, checkfirst=True)
