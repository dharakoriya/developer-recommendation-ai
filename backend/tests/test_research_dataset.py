import os
import sys
import json
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from research.generators.synthetic_generator import generate_synthetic_dataset
from research.labeling.ground_truth_labeler import apply_ground_truth_labels
from research.validation.dataset_validator import validate_dataset_quality
from research.split.dataset_splitter import stratified_split_dataset, export_split_datasets
from research.pipeline import run_dataset_pipeline


def test_synthetic_generator_seed_reproducibility():
    # Same seed produces identical dataset
    data1 = generate_synthetic_dataset(num_developers=10, num_tasks=5, random_seed=42)
    data2 = generate_synthetic_dataset(num_developers=10, num_tasks=5, random_seed=42)

    assert len(data1) == 50
    assert len(data2) == 50
    assert data1[0]["developer_id"] == data2[0]["developer_id"]
    assert data1[0]["dev_experience_years"] == data2[0]["dev_experience_years"]
    assert data1[0]["skill_coverage_ratio"] == data2[0]["skill_coverage_ratio"]

    # Different seed produces different dataset
    data3 = generate_synthetic_dataset(num_developers=10, num_tasks=5, random_seed=999)
    assert data1[0]["developer_id"] != data3[0]["developer_id"]


def test_ground_truth_labeling_logic_and_leakage_prevention():
    raw_data = generate_synthetic_dataset(num_developers=10, num_tasks=5, random_seed=42)
    labeled = apply_ground_truth_labels(raw_data)

    assert len(labeled) == 50
    for row in labeled:
        assert "label_target" in row
        assert row["label_target"] in (0, 1)

        # Verify criterion 1 & 3 enforcement
        if row["skill_coverage_ratio"] < 0.60 or row["dev_workload_score"] > 100.0 or row["dev_availability_status"] == "UNAVAILABLE":
            assert row["label_target"] == 0

        # Data leakage check: Verify target generation does NOT use recommendation score
        assert "recommendation_score" not in row
        assert "shap_value" not in row


def test_dataset_quality_validation():
    raw_data = generate_synthetic_dataset(num_developers=10, num_tasks=5, random_seed=42)
    labeled = apply_ground_truth_labels(raw_data)

    report = validate_dataset_quality(labeled)
    assert report["is_valid"] is True
    assert report["row_count"] == 50
    assert report["missing_value_count"] == 0
    assert report["duplicate_count"] == 0
    assert report["invalid_range_count"] == 0
    assert report["invalid_enum_count"] == 0
    assert report["invalid_label_count"] == 0


def test_stratified_train_val_test_split():
    raw_data = generate_synthetic_dataset(num_developers=20, num_tasks=10, random_seed=42)
    labeled = apply_ground_truth_labels(raw_data)

    train, val, test = stratified_split_dataset(
        labeled, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_seed=42
    )

    total = len(labeled)
    assert len(train) + len(val) + len(test) == total

    # Check zero overlap between splits
    train_keys = set((r["developer_id"], r["task_id"]) for r in train)
    val_keys = set((r["developer_id"], r["task_id"]) for r in val)
    test_keys = set((r["developer_id"], r["task_id"]) for r in test)

    assert len(train_keys.intersection(val_keys)) == 0
    assert len(train_keys.intersection(test_keys)) == 0
    assert len(val_keys.intersection(test_keys)) == 0


def test_full_pipeline_execution(tmp_path):
    output_dir = str(tmp_path / "processed")
    res = run_dataset_pipeline(num_developers=10, num_tasks=5, random_seed=42, output_dir=output_dir)

    assert res["validation"]["is_valid"] is True
    assert os.path.exists(os.path.join(output_dir, "full_dataset.csv"))
    assert os.path.exists(os.path.join(output_dir, "train.csv"))
    assert os.path.exists(os.path.join(output_dir, "val.csv"))
    assert os.path.exists(os.path.join(output_dir, "test.csv"))
    assert os.path.exists(os.path.join(output_dir, "dataset_metadata.json"))

    with open(os.path.join(output_dir, "dataset_metadata.json"), "r") as f:
        meta = json.load(f)

    assert meta["dataset_version"] == "synthetic-v1"
    assert meta["label_strategy"] == "suitability-v1"
    assert meta["total_rows"] == 50
