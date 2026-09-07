import uuid
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Numeric,
    Integer,
    Date,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DeveloperStreak(Base):
    __tablename__ = "developer_streaks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_completion_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
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
    developer_profile = relationship("DeveloperProfile", backref="streak")


class DeveloperAchievement(Base):
    __tablename__ = "developer_achievements"
    __table_args__ = (
        UniqueConstraint("developer_id", "achievement_key", name="uq_developer_achievement"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    achievement_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # consistency, productivity, difficulty, speed
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. 'flame', 'rocket', 'brain', 'zap'
    earned_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    developer_profile = relationship("DeveloperProfile", backref="achievements")


class DeveloperIncentiveLedger(Base):
    __tablename__ = "developer_incentive_ledgers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    base_points: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    difficulty_bonus: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    on_time_bonus: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    streak_bonus: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    total_points: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    earned_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    developer_profile = relationship("DeveloperProfile", backref="incentive_records")
    task = relationship("Task", backref="incentive_records")


class DeveloperPerformanceSnapshot(Base):
    __tablename__ = "developer_performance_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    performance_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    completion_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    on_time_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    weighted_productivity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_incentive_points: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.0"))
    snapshot_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    developer_profile = relationship("DeveloperProfile", backref="performance_snapshots")
