import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.task import Task, TaskSkill
from app.models.enums import TaskComplexity, TaskPriority

COMPLEXITY_FACTOR_MAP = {
    TaskComplexity.LOW: 20.0,
    TaskComplexity.MEDIUM: 50.0,
    TaskComplexity.HIGH: 75.0,
}

PRIORITY_BONUS_MAP = {
    TaskPriority.LOW: 0.0,
    TaskPriority.MEDIUM: 5.0,
    TaskPriority.HIGH: 10.0,
    TaskPriority.CRITICAL: 25.0,
}


def calculate_task_effort_factor(estimated_hours: float) -> float:
    """
    Calculates effort contribution score (0..100) based on estimated effort hours.
    - 1 to 4 hours: 15.0 (Low effort)
    - 5 to 16 hours: 40.0 (Medium effort)
    - 17 to 40 hours: 75.0 (High effort)
    - 40+ hours: 100.0 (Very high effort)
    """
    if estimated_hours <= 4.0:
        return 15.0
    elif estimated_hours <= 16.0:
        return 40.0
    elif estimated_hours <= 40.0:
        return 75.0
    else:
        return 100.0


def calculate_task_skill_difficulty_factor(task_skills: list) -> float:
    """
    Calculates skill difficulty factor (0..100) from required technical skills and target levels.
    """
    if not task_skills:
        return 20.0

    skill_count = len(task_skills)
    levels = [float(ts.required_level) for ts in task_skills]
    avg_level = sum(levels) / skill_count
    high_level_count = sum(1 for lvl in levels if lvl >= 80.0)

    # Base level factor (avg level is 0..100)
    level_factor = avg_level

    # Skill volume multiplier
    count_factor = min(100.0, skill_count * 20.0)

    # Specialist skill bonus
    specialist_bonus = min(25.0, high_level_count * 12.5)

    difficulty_score = (0.50 * level_factor) + (0.30 * count_factor) + (0.20 * specialist_bonus)
    return round(min(100.0, max(0.0, difficulty_score)), 2)


def calculate_task_weight_score(task: Task) -> float:
    """
    Calculates deterministic Task Weight Score (1..100).
    Task Weight = 0.40 * ComplexityFactor + 0.35 * EffortFactor + 0.25 * SkillDifficultyFactor
    """
    base_complexity = COMPLEXITY_FACTOR_MAP.get(task.complexity, 50.0)
    priority_bonus = PRIORITY_BONUS_MAP.get(task.priority, 0.0)
    complexity_factor = min(100.0, base_complexity + priority_bonus)

    effort_hours = float(task.estimated_hours) if task.estimated_hours else 8.0
    effort_factor = calculate_task_effort_factor(effort_hours)

    task_skills = task.task_skills or []
    skill_difficulty_factor = calculate_task_skill_difficulty_factor(task_skills)

    raw_weight = (0.40 * complexity_factor) + (0.35 * effort_factor) + (0.25 * skill_difficulty_factor)
    final_weight = round(min(100.0, max(1.0, raw_weight)), 2)
    return final_weight


def update_and_persist_task_weight(db: Session, task_id: uuid.UUID) -> float:
    """
    Calculates and persists task_weight_score for a task in PostgreSQL.
    """
    task = db.execute(
        select(Task)
        .options(joinedload(Task.task_skills))
        .where(Task.id == task_id)
    ).unique().scalar_one_or_none()

    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    weight = calculate_task_weight_score(task)
    task.task_weight_score = Decimal(str(weight))
    db.commit()
    db.refresh(task)
    return weight
