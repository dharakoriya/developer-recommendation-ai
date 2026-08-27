import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    ForeignKey,
    Enum as SQLEnum,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import LabelStatus, ValidationStatus


class RecommendationLabelValidation(Base):
    """
    Research label proposals and human validation records for recommendation observations.
    Tracks proposed research labels (WEAK_LABEL), human validator sign-offs (VALIDATED_LABEL),
    reasons, and validation timestamps without overwriting underlying audit evidence.
    """
    __tablename__ = "recommendation_label_validations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recommendation_audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendation_audits.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    observation_id: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    proposed_research_label: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    label_status: Mapped[LabelStatus] = mapped_column(
        SQLEnum(LabelStatus), nullable=False, default=LabelStatus.UNLABELED
    )
    label_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    validation_status: Mapped[ValidationStatus] = mapped_column(
        SQLEnum(ValidationStatus), nullable=False, default=ValidationStatus.UNVALIDATED
    )
    validator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    validation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    validated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    recommendation_audit = relationship("RecommendationAudit")
    validator = relationship("User")
