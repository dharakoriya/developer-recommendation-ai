from typing import List, Dict, Any

VALID_AVAILABILITIES = {"AVAILABLE", "PARTIAL", "UNAVAILABLE"}
VALID_COMPLEXITIES = {"LOW", "MEDIUM", "HIGH"}
VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
VALID_WORKLOAD_STATUSES = {"AVAILABLE", "BALANCED", "HIGH", "OVERLOADED"}


def validate_dataset_quality(dataset_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Performs comprehensive data quality and schema validation checks on dataset rows.
    """
    row_count = len(dataset_rows)
    if row_count == 0:
        return {
            "is_valid": False,
            "error": "Dataset is empty.",
            "row_count": 0,
        }

    missing_count = 0
    duplicate_count = 0
    invalid_range_count = 0
    invalid_enum_count = 0
    invalid_label_count = 0

    seen_pairs = set()

    pos_count = 0
    neg_count = 0

    for i, row in enumerate(dataset_rows):
        # 1. Missing Values Check
        for k, v in row.items():
            if v is None and k != "label_target":
                missing_count += 1

        # 2. Duplicate Pairs Check
        pair_key = (row.get("developer_id"), row.get("task_id"))
        if pair_key in seen_pairs:
            duplicate_count += 1
        seen_pairs.add(pair_key)

        # 3. Domain Range Checks
        if row.get("dev_experience_years", 0) < 0:
            invalid_range_count += 1
        if not (0 <= row.get("dev_performance_score", 0) <= 100):
            invalid_range_count += 1
        if row.get("dev_workload_score", 0) < 0:
            invalid_range_count += 1
        if row.get("task_estimated_hours", 0) <= 0:
            invalid_range_count += 1

        # 4. Enum Bounds Checks
        if row.get("dev_availability_status") not in VALID_AVAILABILITIES:
            invalid_enum_count += 1
        if row.get("task_complexity") not in VALID_COMPLEXITIES:
            invalid_enum_count += 1
        if row.get("task_priority") not in VALID_PRIORITIES:
            invalid_enum_count += 1
        if row.get("dev_workload_status") not in VALID_WORKLOAD_STATUSES:
            invalid_enum_count += 1

        # 5. Label Target Check
        label = row.get("label_target")
        if label not in (0, 1):
            invalid_label_count += 1
        elif label == 1:
            pos_count += 1
        elif label == 0:
            neg_count += 1

    feature_count = len(dataset_rows[0].keys()) - 3 if row_count > 0 else 0
    pos_percentage = round((pos_count / row_count) * 100.0, 2) if row_count > 0 else 0.0

    is_valid = (
        missing_count == 0
        and duplicate_count == 0
        and invalid_range_count == 0
        and invalid_enum_count == 0
        and invalid_label_count == 0
    )

    return {
        "is_valid": is_valid,
        "row_count": row_count,
        "feature_count": feature_count,
        "positive_label_count": pos_count,
        "negative_label_count": neg_count,
        "positive_percentage": pos_percentage,
        "missing_value_count": missing_count,
        "duplicate_count": duplicate_count,
        "invalid_range_count": invalid_range_count,
        "invalid_enum_count": invalid_enum_count,
        "invalid_label_count": invalid_label_count,
    }
