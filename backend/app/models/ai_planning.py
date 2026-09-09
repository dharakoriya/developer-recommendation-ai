import uuid
from sqlalchemy import String, Text, Integer, Numeric, Boolean, Enum as SQLEnum, DateTime, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    TaskPriority,
    TaskComplexity,
    AIPlanStatus,
    AIPlanTaskStatus,
    AIPlanGranularity,
    AIProjectType,
)


class AIProjectPlan(Base):
    __tablename__ = "ai_project_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_name: Mapped[str] = mapped_column(String(150), nullable=False)
    project_description: Mapped[str] = mapped_column(Text, nullable=False)
    business_objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_users: Mapped[str | None] = mapped_column(Text, nullable=True)
    functional_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    technology_stack: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(50), nullable=True)
    granularity: Mapped[AIPlanGranularity] = mapped_column(
        SQLEnum(AIPlanGranularity, name="ai_plan_granularity_enum"),
        default=AIPlanGranularity.BALANCED,
        nullable=False,
    )
    project_type: Mapped[AIProjectType] = mapped_column(
        SQLEnum(AIProjectType, name="ai_project_type_enum"),
        default=AIProjectType.WEB_APP,
        nullable=False,
    )
    preferred_team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[AIPlanStatus] = mapped_column(
        SQLEnum(AIPlanStatus, name="ai_plan_status_enum"),
        default=AIPlanStatus.DRAFT,
        nullable=False,
    )

    summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    planning_input_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    ai_provider: Mapped[str] = mapped_column(String(50), default="mock", nullable=False)
    ai_model: Mapped[str] = mapped_column(String(50), default="heuristic-v1", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    applied_project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    tasks = relationship(
        "AIProjectPlanTask",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="AIProjectPlanTask.created_at",
    )
    creator = relationship("User", foreign_keys=[created_by])
    applied_project = relationship("Project", foreign_keys=[applied_project_id])


class AIProjectPlanTask(Base):
    __tablename__ = "ai_project_plan_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_project_plans.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    module: Mapped[str | None] = mapped_column(String(100), nullable=True)

    priority: Mapped[TaskPriority] = mapped_column(
        SQLEnum(TaskPriority, name="task_priority_enum"), default=TaskPriority.MEDIUM, nullable=False
    )
    complexity: Mapped[TaskComplexity] = mapped_column(
        SQLEnum(TaskComplexity, name="task_complexity_enum"), default=TaskComplexity.MEDIUM, nullable=False
    )
    estimated_hours: Mapped[float] = mapped_column(Numeric(5, 2), default=8.0, nullable=False)

    required_skills: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    dependencies: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    acceptance_criteria: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)

    status: Mapped[AIPlanTaskStatus] = mapped_column(
        SQLEnum(AIPlanTaskStatus, name="ai_plan_task_status_enum"),
        default=AIPlanTaskStatus.PROPOSED,
        nullable=False,
    )
    is_manually_added: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    plan = relationship("AIProjectPlan", back_populates="tasks")
