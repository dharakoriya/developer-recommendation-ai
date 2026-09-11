import uuid
from typing import Dict, Any, List, Tuple, Optional
from decimal import Decimal

from app.config import settings
from app.schemas.feature import CandidateFeatureVector
from app.models.enums import ShapDirection, AvailabilityStatus
from app.services.task_weight_service import get_task_weight_category


def evaluate_task_developer_compatibility(
    vec: CandidateFeatureVector, task_weight_score: float = 50.0
) -> Dict[str, Any]:
    """
    Computes 7-factor transparent compatibility score (0..100), eligibility status,
    exclusion reasons, and explainable feature contributions for baseline-v2 engine:
    1. Skill Proficiency Match (settings.REC_WEIGHT_SKILL_MATCH)
    2. Skill Coverage (settings.REC_WEIGHT_SKILL_COVERAGE)
    3. Workload Capacity & Anti-Monopoly Protection (settings.REC_WEIGHT_WORKLOAD)
    4. Availability (settings.REC_WEIGHT_AVAILABILITY)
    5. Relevant Experience (settings.REC_WEIGHT_EXPERIENCE)
    6. Developer Performance (settings.REC_WEIGHT_PERFORMANCE)
    7. Task Weight Compatibility (settings.REC_WEIGHT_TASK_COMPAT)
    """
    task_category = get_task_weight_category(task_weight_score)

    # 1. Skill Match Contribution
    s_skill = min(100.0, max(0.0, vec.weighted_skill_match_score)) / 100.0
    c_skill = round(s_skill * settings.REC_WEIGHT_SKILL_MATCH, 2)

    # 2. Skill Coverage Contribution
    s_coverage = min(1.0, max(0.0, vec.skill_coverage_ratio))
    c_coverage = round(s_coverage * settings.REC_WEIGHT_SKILL_COVERAGE, 2)

    # 3. Workload Capacity & Anti-Monopoly Penalty
    if vec.dev_workload_score <= 100.0:
        s_workload = 1.0 - (vec.dev_workload_score / 100.0)
    else:
        s_workload = 0.0

    # Base workload contribution
    c_workload_base = s_workload * settings.REC_WEIGHT_WORKLOAD

    # Anti-monopoly capacity penalty for heavily assigned / overloaded developers
    anti_monopoly_penalty = 0.0
    if vec.dev_workload_score >= 80.0:
        anti_monopoly_penalty += 3.0
    if vec.dev_active_task_count >= 3:
        anti_monopoly_penalty += 2.0

    c_workload = round(max(0.0, c_workload_base - anti_monopoly_penalty), 2)

    # 4. Availability Contribution
    avail_str = str(vec.dev_availability_status).upper()
    if avail_str == "AVAILABLE":
        c_avail = settings.REC_WEIGHT_AVAILABILITY
    elif avail_str == "PARTIAL":
        c_avail = settings.REC_WEIGHT_AVAILABILITY * 0.5
    else:
        c_avail = 0.0

    # 5. Relevant Experience Contribution
    s_exp = min(5.0, max(0.0, vec.dev_experience_years)) / 5.0
    c_exp = round(s_exp * settings.REC_WEIGHT_EXPERIENCE, 2)

    # 6. Developer Performance Contribution
    s_perf = min(100.0, max(0.0, vec.dev_performance_score)) / 100.0
    c_perf = round(s_perf * settings.REC_WEIGHT_PERFORMANCE, 2)

    # 7. Task Weight Compatibility Contribution
    c_task_compat = settings.REC_WEIGHT_TASK_COMPAT
    task_compat_reason = "High alignment with task weight demands"

    if task_category == "CRITICAL":
        if vec.dev_performance_score < 75.0 or vec.dev_experience_years < 2.0:
            c_task_compat = 3.0
            task_compat_reason = "Limited experience or performance for Critical task"
        elif vec.dev_performance_score < 85.0:
            c_task_compat = 6.0
            task_compat_reason = "Moderate performance for Critical task"
    elif task_category == "HEAVY":
        if vec.dev_performance_score < 60.0 or vec.dev_experience_years < 1.0:
            c_task_compat = 4.0
            task_compat_reason = "Lower experience for Heavy task"
        elif vec.dev_performance_score < 75.0:
            c_task_compat = 7.0
            task_compat_reason = "Acceptable performance for Heavy task"
    elif task_category == "LIGHT":
        # Junior/moderate developers get full compatibility on Light tasks
        c_task_compat = 10.0
        task_compat_reason = "Well-suited capacity for Light task"

    total_score = round(c_skill + c_coverage + c_workload + c_avail + c_exp + c_perf + c_task_compat, 2)

    # --- HARD ELIGIBILITY RULES & EXCLUSION REASONS ---
    exclusion_reasons: List[str] = []

    # Check Ineligible triggers
    is_unavailable = avail_str == "UNAVAILABLE"
    has_missing_skills = vec.task_required_skill_count > 0 and vec.skill_coverage_ratio < 0.50
    is_overloaded = vec.dev_workload_score > 100.0

    if is_unavailable:
        exclusion_reasons.append("❌ Developer Currently Unavailable")
    if has_missing_skills:
        exclusion_reasons.append(f"❌ Missing Required Skills (Coverage: {vec.skill_coverage_ratio * 100:.0f}%)")
    if is_overloaded:
        exclusion_reasons.append(f"❌ Workload Exceeds Capacity Limit ({vec.dev_workload_score:.0f}%)")

    if exclusion_reasons:
        eligibility_status = "INELIGIBLE"
    else:
        # Check Conditionally Eligible triggers
        cond_reasons: List[str] = []
        if vec.task_required_skill_count > 0 and vec.skill_coverage_ratio < 1.0:
            cond_reasons.append(f"⚠ Partial Skill Coverage ({vec.skill_coverage_ratio * 100:.0f}%)")
        if vec.dev_workload_score >= 80.0:
            cond_reasons.append(f"⚠ High Current Workload ({vec.dev_workload_score:.0f}%)")
        if task_category in ("HEAVY", "CRITICAL") and (vec.dev_experience_years < 2.0 or vec.dev_performance_score < 75.0):
            cond_reasons.append("⚠ Limited Experience/Performance for High Weight Task")

        if cond_reasons:
            eligibility_status = "CONDITIONALLY_ELIGIBLE"
            exclusion_reasons = cond_reasons
        else:
            eligibility_status = "ELIGIBLE"

    # --- EXPLANATION CONTRIBUTIONS & PENALTIES ---
    contributions = [
        {
            "feature_name": "weighted_skill_match_score",
            "feature_value": f"{vec.weighted_skill_match_score:.1f}%",
            "contribution_score": c_skill,
            "direction": ShapDirection.POSITIVE if c_skill >= 15.0 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "skill_coverage_ratio",
            "feature_value": f"{(vec.skill_coverage_ratio * 100):.1f}% ({vec.matching_skill_count}/{vec.task_required_skill_count})",
            "contribution_score": c_coverage,
            "direction": ShapDirection.POSITIVE if c_coverage >= 7.5 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "dev_workload_score",
            "feature_value": f"{vec.dev_workload_score:.1f}% ({vec.dev_workload_status})",
            "contribution_score": c_workload,
            "direction": ShapDirection.POSITIVE if c_workload >= 7.5 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "dev_availability_status",
            "feature_value": avail_str,
            "contribution_score": c_avail,
            "direction": ShapDirection.POSITIVE if c_avail >= 5.0 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "dev_experience_years",
            "feature_value": f"{vec.dev_experience_years:.1f} yrs",
            "contribution_score": c_exp,
            "direction": ShapDirection.POSITIVE if c_exp >= 5.0 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "dev_performance_score",
            "feature_value": f"{vec.dev_performance_score:.1f} / 100",
            "contribution_score": c_perf,
            "direction": ShapDirection.POSITIVE if c_perf >= 5.0 else ShapDirection.NEGATIVE,
        },
        {
            "feature_name": "task_weight_compatibility",
            "feature_value": f"Weight: {task_weight_score:.0f} ({task_category}) — {task_compat_reason}",
            "contribution_score": c_task_compat,
            "direction": ShapDirection.POSITIVE if c_task_compat >= 7.0 else ShapDirection.NEGATIVE,
        },
    ]

    return {
        "final_score": total_score,
        "eligibility_status": eligibility_status,
        "exclusion_reasons": exclusion_reasons,
        "contributions": contributions,
    }
