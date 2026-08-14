import uuid
from decimal import Decimal
from sqlalchemy import (
    String,
    Numeric,
    Integer,
    ForeignKey,
    Enum as SQLEnum,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import AvailabilityStatus


class DeveloperProfile(Base):
    __tablename__ = "developer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    experience_years: Mapped[Decimal] = mapped_column(
        Numeric(4, 1), nullable=False
    )
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        SQLEnum(AvailabilityStatus, name="availability_status_enum"),
        nullable=False,
    )
    performance_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
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
    user = relationship("User", back_populates="developer_profile")
    developer_skills = relationship(
        "DeveloperSkill", back_populates="developer_profile", cascade="all, delete-orphan"
    )
    team_memberships = relationship(
        "TeamMember", back_populates="developer_profile", cascade="all, delete-orphan"
    )
    assignments = relationship("Assignment", back_populates="developer_profile")
    recommendations = relationship(
        "Recommendation", back_populates="developer_profile"
    )
    workload_records = relationship(
        "WorkloadRecord", back_populates="developer_profile", cascade="all, delete-orphan"
    )


class DeveloperSkill(Base):
    __tablename__ = "developer_skills"
    __table_args__ = (
        UniqueConstraint("developer_id", "skill_id", name="uq_developer_skill"),
        CheckConstraint(
            "proficiency_level >= 0 AND proficiency_level <= 100",
            name="ck_developer_skill_proficiency",
        ),
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
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    proficiency_level: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
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
    developer_profile = relationship("DeveloperProfile", back_populates="developer_skills")
    skill = relationship("Skill", back_populates="developer_skills")


class WorkloadRecord(Base):
    __tablename__ = "workload_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workload_score: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), nullable=False
    )
    active_task_count: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_hours: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False
    )
    availability_factor: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    calculated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    developer_profile = relationship("DeveloperProfile", back_populates="workload_records")
