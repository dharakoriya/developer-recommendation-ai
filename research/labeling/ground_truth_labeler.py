from typing import List, Dict, Any, Optional

DEFAULT_MIN_SKILL_COVERAGE = 0.60
DEFAULT_MAX_PROFICIENCY_DEFICIENCY = -20.0
DEFAULT_MAX_WORKLOAD_SCORE = 100.0


def apply_ground_truth_labels(
    dataset_rows: List[Dict[str, Any]],
    min_skill_coverage: float = DEFAULT_MIN_SKILL_COVERAGE,
    max_proficiency_deficiency: float = DEFAULT_MAX_PROFICIENCY_DEFICIENCY,
    max_workload_score: float = DEFAULT_MAX_WORKLOAD_SCORE,
) -> List[Dict[str, Any]]:
    """
    Applies multi-dimensional research ground-truth suitability criteria (label_target: 0 or 1).

    Data Leakage Prevention:
    Depends strictly on raw domain feature attributes (skill coverage, proficiency gap, workload score, availability)
    and does NOT consume or copy the Milestone 9 recommendation score or model outputs.
    """
    labeled_rows = []
    for row in dataset_rows:
        # Copy row dictionary
        labeled = dict(row)

        # Criterion 1: Skill Coverage Ratio >= min_skill_coverage (e.g. 60%)
        c1 = row["skill_coverage_ratio"] >= min_skill_coverage

        # Criterion 2: Min Proficiency Gap >= max_proficiency_deficiency (e.g. -20.0 points)
        c2 = row["min_proficiency_gap"] >= max_proficiency_deficiency

        # Criterion 3: Workload Score <= max_workload_score (e.g. 100.0% max capacity)
        c3 = row["dev_workload_score"] <= max_workload_score

        # Criterion 4: Availability != UNAVAILABLE
        c4 = row["dev_availability_status"] != "UNAVAILABLE"

        # Suitable (1) if all research criteria are satisfied; else Unsuitable (0)
        is_suitable = 1 if (c1 and c2 and c3 and c4) else 0

        labeled["label_target"] = is_suitable
        labeled_rows.append(labeled)

    return labeled_rows
