"""fix recommendation score precision

Revision ID: 002
Revises: 001
Create Date: 2026-08-29

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alter recommendations.score column to Numeric(10, 4) to support 0-100 range scores (e.g., 94.8)
    op.alter_column(
        'recommendations',
        'score',
        existing_type=sa.Numeric(precision=7, scale=6),
        type_=sa.Numeric(precision=10, scale=4),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'recommendations',
        'score',
        existing_type=sa.Numeric(precision=10, scale=4),
        type_=sa.Numeric(precision=7, scale=6),
        existing_nullable=False,
    )
