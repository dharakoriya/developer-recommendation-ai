import os
import csv
import json
from typing import List, Dict, Any, Tuple
import numpy as np

# Feature selection specification (20 numeric/encoded features)
SELECTED_FEATURES = [
    "dev_experience_years",
    "dev_availability_encoded",
    "dev_performance_score",
    "dev_total_skills_count",
    "dev_workload_score",
    "dev_capacity_hours",
    "dev_active_task_count",
    "dev_workload_status_encoded",
    "task_estimated_hours",
    "task_complexity_encoded",
    "task_priority_encoded",
    "task_required_skill_count",
    "matching_skill_count",
    "skill_coverage_ratio",
    "avg_required_level",
    "avg_developer_level",
    "avg_proficiency_gap",
    "min_proficiency_gap",
    "weighted_skill_match_score",
    "is_historically_assigned",
]

TARGET_COL = "label_target"


def load_dataset_split(csv_path: str) -> Tuple[np.ndarray, np.ndarray, List[Dict[str, Any]]]:
    """
    Loads dataset CSV split and extracts X (feature matrix), y (target vector), and raw row dicts.
    Excludes identifiers and text metadata to prevent target leakage.
    """
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    X_list = []
    y_list = []

    for r in rows:
        feat_vec = [float(r[col]) for col in SELECTED_FEATURES]
        X_list.append(feat_vec)
        y_list.append(int(r[TARGET_COL]))

    X = np.array(X_list, dtype=np.float64)
    y = np.array(y_list, dtype=np.int64)

    return X, y, rows


class SimpleStandardScaler:
    """
    Reproducible Standard Scaler (mean & std standardization).
    Fitted ONLY on training dataset split.
    """

    def __init__(self):
        self.mean_ = None
        self.scale_ = None

    def fit(self, X: np.ndarray):
        self.mean_ = np.mean(X, axis=0)
        self.scale_ = np.std(X, axis=0)
        # Avoid division by zero for zero variance features
        self.scale_[self.scale_ == 0.0] = 1.0
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.scale_

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        return self.fit(X).transform(X)


def prepare_ml_data(
    processed_dir: str
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, SimpleStandardScaler]:
    """
    Loads train, val, test CSV splits and applies fitted scaler on training set.
    """
    train_path = os.path.join(processed_dir, "train.csv")
    val_path = os.path.join(processed_dir, "val.csv")
    test_path = os.path.join(processed_dir, "test.csv")

    X_train_raw, y_train, _ = load_dataset_split(train_path)
    X_val_raw, y_val, _ = load_dataset_split(val_path)
    X_test_raw, y_test, _ = load_dataset_split(test_path)

    scaler = SimpleStandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_val = scaler.transform(X_val_raw)
    X_test = scaler.transform(X_test_raw)

    return X_train, y_train, X_val, y_val, X_test, y_test, scaler
