import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    ForeignKey,
    DateTime,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecommendationDatasetSnapshot(Base):
    """
    Immutable versioned real-world dataset snapshot records (e.g. realworld-v1.0, realworld-v1.1).
    Tracks observation ranges, label counts, quality status, and snapshot provenance metadata.
    Existing snapshots are immutable and never silently overwritten.
    """
    __tablename__ = "recommendation_dataset_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dataset_version: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    creation_timestamp: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    source_observation_range: Mapped[str] = mapped_column(
        String(100), nullable=False, default="all_available"
    )
    total_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    labeled_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    validated_labels: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    positive_labels: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    negative_labels: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ambiguous_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    feature_version: Mapped[str] = mapped_column(
        String(50), nullable=False, default="v1.0"
    )
    label_methodology_version: Mapped[str] = mapped_column(
        String(50), nullable=False, default="suitability-v1"
    )
    data_quality_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="PASS"
    )
    snapshot_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Relationships
    created_by = relationship("User")
