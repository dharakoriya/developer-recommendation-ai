import uuid
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Numeric,
    Integer,
    Boolean,
    ForeignKey,
    Enum as SQLEnum,
    DateTime,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import FeedbackDecision, OutcomeStatus


class RecommendationAudit(Base):
    """
    Audit log preserving original recommendation feature snapshots and metadata.
    Protects historical reproducibility against future developer/task data updates.
    """
    __tablename__ = "recommendation_audits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_score: Mapped[Decimal] = mapped_column(
        Numeric(7, 4), nullable=False
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    environment: Mapped[str] = mapped_column(String(20), nullable=False, default="production")
    feature_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    recommendation = relationship("Recommendation")
    developer_profile = relationship("DeveloperProfile")
    task = relationship("Task")
    project = relationship("Project")


class RecommendationFeedback(Base):
    """
    Human reviewer feedback capturing decisions (ACCEPTED, REJECTED, IGNORED, DEFERRED).
    """
    __tablename__ = "recommendation_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    decision: Mapped[FeedbackDecision] = mapped_column(
        SQLEnum(FeedbackDecision), nullable=False
    )
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    recommendation = relationship("Recommendation")
    reviewer = relationship("User")


class RecommendationOutcome(Base):
    """
    Tracking event lifecycle from recommendation to actual assignment and completion.
    Distinctly tracks RECOMMENDED -> ACCEPTED -> ASSIGNED -> COMPLETED.
    """
    __tablename__ = "recommendation_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    was_assigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assignment_created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    assignment_outcome_status: Mapped[OutcomeStatus] = mapped_column(
        SQLEnum(OutcomeStatus), nullable=False, default=OutcomeStatus.RECOMMENDED
    )
    completed_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    recommendation = relationship("Recommendation")
    developer_profile = relationship("DeveloperProfile")
    task = relationship("Task")
    assignment = relationship("Assignment")
