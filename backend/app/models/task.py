import uuid
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Numeric,
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
from app.models.enums import TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("estimated_hours > 0", name="ck_task_estimated_hours_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(
        SQLEnum(TaskPriority, name="task_priority_enum"), nullable=False
    )
    complexity: Mapped[TaskComplexity] = mapped_column(
        SQLEnum(TaskComplexity, name="task_complexity_enum"), nullable=False
    )
    estimated_hours: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    task_weight_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    deadline: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus, name="task_status_enum"), nullable=False, index=True
    )
    started_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_actual_minutes: Mapped[int] = mapped_column(
        nullable=False, default=0
    )
    is_timer_running: Mapped[bool] = mapped_column(
        nullable=False, default=False
    )
    timer_started_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
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
    project = relationship("Project", back_populates="tasks")
    team = relationship("Team", back_populates="tasks")
    creator = relationship("User", back_populates="created_tasks")
    task_skills = relationship(
        "TaskSkill", back_populates="task", cascade="all, delete-orphan"
    )
    assignments = relationship("Assignment", back_populates="task")
    recommendations = relationship(
        "Recommendation", back_populates="task", cascade="all, delete-orphan"
    )


class TaskSkill(Base):
    __tablename__ = "task_skills"
    __table_args__ = (
        UniqueConstraint("task_id", "skill_id", name="uq_task_skill"),
        CheckConstraint(
            "required_level >= 0 AND required_level <= 100",
            name="ck_task_skill_required_level",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    required_level: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    task = relationship("Task", back_populates="task_skills")
    skill = relationship("Skill", back_populates="task_skills")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("developer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        SQLEnum(AssignmentStatus, name="assignment_status_enum"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reassigned_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    task = relationship("Task", back_populates="assignments")
    developer_profile = relationship("DeveloperProfile", back_populates="assignments")
    assigner = relationship("User", back_populates="assigned_assignments")
