import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.task import Task, TaskSkill
from app.models.enums import TaskComplexity, TaskPriority

COMPLEXITY_SCORE_MAP = {
    TaskComplexity.LOW: 25.0,
    TaskComplexity.MEDIUM: 50.0,
    TaskComplexity.HIGH: 75.0,
}

PRIORITY_SCORE_MAP = {
    TaskPriority.LOW: 25.0,
    TaskPriority.MEDIUM: 50.0,
    TaskPriority.HIGH: 75.0,
    TaskPriority.CRITICAL: 100.0,
}


def calculate_task_effort_score(estimated_hours: float) -> float:
    """
    Calculates estimated effort component score (20.0..100.0) based on estimated effort hours:
    - 1 to 4 hours: 20.0
    - 5 to 8 hours: 40.0
    - 9 to 16 hours: 60.0
    - 17 to 40 hours: 80.0
    - 40+ hours: 100.0
    """
    if estimated_hours <= 4.0:
        return 20.0
    elif estimated_hours <= 8.0:
        return 40.0
    elif estimated_hours <= 16.0:
        return 60.0
    elif estimated_hours <= 40.0:
        return 80.0
    else:
        return 100.0


def calculate_task_skill_difficulty_score(task_skills: list) -> float:
    """
    Calculates skill requirement difficulty score (0..100) considering:
    - Skill count
    - Average required proficiency level
    - High-proficiency specialist requirement count
    """
    if not task_skills:
        return 20.0

    skill_count = len(task_skills)
    levels = [float(ts.required_level) for ts in task_skills]
    avg_level = sum(levels) / skill_count
    high_level_count = sum(1 for lvl in levels if lvl >= 80.0)

    level_factor = avg_level
    count_factor = min(100.0, skill_count * 20.0)
    specialist_bonus = min(25.0, high_level_count * 12.5)

    difficulty_score = (0.50 * level_factor) + (0.30 * count_factor) + (0.20 * specialist_bonus)
    return round(min(100.0, max(0.0, difficulty_score)), 2)


# Backward compatible aliases
calculate_task_effort_factor = calculate_task_effort_score
calculate_task_skill_difficulty_factor = calculate_task_skill_difficulty_score



def get_task_weight_category(score: float) -> str:
    """
    Maps Task Weight score (1..100) into standard categories:
    - 1 to 25: LIGHT
    - 26 to 50: MODERATE
    - 51 to 75: HEAVY
    - 76 to 100: CRITICAL
    """
    if score <= 25.0:
        return "LIGHT"
    elif score <= 50.0:
        return "MODERATE"
    elif score <= 75.0:
        return "HEAVY"
    else:
        return "CRITICAL"


def calculate_task_weight_score(task: Task) -> float:
    """
    Calculates deterministic Task Weight Score (1..100) using exact Milestone 21 formula:
    Task Weight = 0.40 * ComplexityScore (40%) +
                  0.25 * PriorityScore (25%) +
                  0.20 * EffortScore (20%) +
                  0.15 * SkillRequirementScore (15%)
    """
    complexity_score = COMPLEXITY_SCORE_MAP.get(task.complexity, 50.0)
    priority_score = PRIORITY_SCORE_MAP.get(task.priority, 50.0)

    effort_hours = float(task.estimated_hours) if task.estimated_hours else 8.0
    effort_score = calculate_task_effort_score(effort_hours)

    task_skills = task.task_skills or []
    skill_difficulty_score = calculate_task_skill_difficulty_score(task_skills)

    raw_weight = (
        (0.40 * complexity_score)
        + (0.25 * priority_score)
        + (0.20 * effort_score)
        + (0.15 * skill_difficulty_score)
    )

    final_weight = round(min(100.0, max(1.0, raw_weight)), 2)
    return final_weight


def update_and_persist_task_weight(db: Session, task_id: uuid.UUID) -> float:
    """
    Calculates and persists task_weight_score for a task in PostgreSQL database.
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
