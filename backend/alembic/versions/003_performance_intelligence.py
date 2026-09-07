"""add performance intelligence tables and task weight score

Revision ID: 003
Revises: 002
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add task_weight_score to tasks table
    op.add_column('tasks', sa.Column('task_weight_score', sa.Numeric(precision=5, scale=2), nullable=True))

    # 2. Create developer_streaks table
    op.create_table(
        'developer_streaks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('longest_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_completion_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_developer_streaks_developer_id'), 'developer_streaks', ['developer_id'], unique=True)

    # 3. Create developer_achievements table
    op.create_table(
        'developer_achievements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('achievement_key', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('icon', sa.String(length=50), nullable=False),
        sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('developer_id', 'achievement_key', name='uq_developer_achievement'),
    )
    op.create_index(op.f('ix_developer_achievements_developer_id'), 'developer_achievements', ['developer_id'], unique=False)
    op.create_index(op.f('ix_developer_achievements_achievement_key'), 'developer_achievements', ['achievement_key'], unique=False)

    # 4. Create developer_incentive_ledgers table
    op.create_table(
        'developer_incentive_ledgers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('base_points', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('difficulty_bonus', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('on_time_bonus', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('streak_bonus', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('total_points', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_developer_incentive_ledgers_developer_id'), 'developer_incentive_ledgers', ['developer_id'], unique=False)
    op.create_index(op.f('ix_developer_incentive_ledgers_task_id'), 'developer_incentive_ledgers', ['task_id'], unique=False)

    # 5. Create developer_performance_snapshots table
    op.create_table(
        'developer_performance_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('developer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('developer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('performance_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('completion_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('on_time_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('weighted_productivity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_incentive_points', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('snapshot_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_developer_performance_snapshots_developer_id'), 'developer_performance_snapshots', ['developer_id'], unique=False)


def downgrade() -> None:
    op.drop_table('developer_performance_snapshots')
    op.drop_table('developer_incentive_ledgers')
    op.drop_table('developer_achievements')
    op.drop_table('developer_streaks')
    op.drop_column('tasks', 'task_weight_score')
