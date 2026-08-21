import os
import sys
from typing import Dict, Any

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from research.generators.synthetic_generator import generate_synthetic_dataset
from research.labeling.ground_truth_labeler import apply_ground_truth_labels
from research.validation.dataset_validator import validate_dataset_quality
from research.split.dataset_splitter import export_split_datasets


def run_dataset_pipeline(
    num_developers: int = 50,
    num_tasks: int = 30,
    random_seed: int = 42,
    output_dir: str = os.path.join(os.path.dirname(__file__), "dataset", "processed"),
) -> Dict[str, Any]:
    """
    Executes the complete research dataset pipeline:
    1. Generates reproducible synthetic candidate pair feature vectors (Developer, Task).
    2. Applies deterministic multi-dimensional ground-truth labeling (label_target: 0 or 1).
    3. Validates dataset quality, schema integrity, and label distribution.
    4. Stratifies into Train (70%), Validation (15%), and Test (15%) sets.
    5. Exports CSV files and dataset_metadata.json.
    """
    print(f"[Pipeline] 1. Generating synthetic dataset (devs={num_developers}, tasks={num_tasks}, seed={random_seed})...")
    raw_rows = generate_synthetic_dataset(
        num_developers=num_developers,
        num_tasks=num_tasks,
        random_seed=random_seed,
    )
    print(f"[Pipeline] Generated {len(raw_rows)} candidate feature pair vectors.")

    print("[Pipeline] 2. Applying research ground-truth labeling rules...")
    labeled_rows = apply_ground_truth_labels(raw_rows)

    print("[Pipeline] 3. Validating dataset quality & schema bounds...")
    val_report = validate_dataset_quality(labeled_rows)
    if not val_report["is_valid"]:
        raise ValueError(f"Dataset validation failed: {val_report}")

    print(f"[Pipeline] Validation Passed! Total Rows: {val_report['row_count']}, Positives: {val_report['positive_label_count']} ({val_report['positive_percentage']}%)")

    print(f"[Pipeline] 4. Exporting train/val/test splits to {output_dir}...")
    metadata = export_split_datasets(
        dataset_rows=labeled_rows,
        output_dir=output_dir,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        random_seed=random_seed,
        dataset_version="synthetic-v1",
        label_strategy="suitability-v1",
    )

    print("[Pipeline] [SUCCESS] Research Dataset Pipeline completed successfully!")
    print(f"[Pipeline] Metadata saved to: {os.path.join(output_dir, 'dataset_metadata.json')}")

    return {
        "validation": val_report,
        "metadata": metadata,
    }


if __name__ == "__main__":
    run_dataset_pipeline()
