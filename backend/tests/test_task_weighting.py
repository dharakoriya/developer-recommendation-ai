import pytest
from decimal import Decimal
from app.models.task import Task, TaskSkill
from app.models.enums import TaskComplexity, TaskPriority, TaskStatus
from app.services.task_weight_service import (
    calculate_task_effort_factor,
    calculate_task_skill_difficulty_factor,
    calculate_task_weight_score,
)


def test_task_effort_factor_scaling():
    assert calculate_task_effort_factor(2.0) == 20.0
    assert calculate_task_effort_factor(6.0) == 40.0
    assert calculate_task_effort_factor(30.0) == 80.0
    assert calculate_task_effort_factor(50.0) == 100.0


def test_task_skill_difficulty_factor():
    ts1 = TaskSkill(required_level=Decimal("85.0"))
    ts2 = TaskSkill(required_level=Decimal("90.0"))

    diff = calculate_task_skill_difficulty_factor([ts1, ts2])
    assert diff > 50.0

    empty_diff = calculate_task_skill_difficulty_factor([])
    assert empty_diff == 20.0


def test_calculate_task_weight_score():
    t_low = Task(
        complexity=TaskComplexity.LOW,
        priority=TaskPriority.LOW,
        estimated_hours=Decimal("4.0"),
        task_skills=[],
    )
    weight_low = calculate_task_weight_score(t_low)
    assert 1.0 <= weight_low <= 35.0

    t_high = Task(
        complexity=TaskComplexity.HIGH,
        priority=TaskPriority.CRITICAL,
        estimated_hours=Decimal("45.0"),
        task_skills=[
            TaskSkill(required_level=Decimal("90.0")),
            TaskSkill(required_level=Decimal("85.0")),
        ],
    )
    weight_high = calculate_task_weight_score(t_high)
    assert weight_high >= 75.0
