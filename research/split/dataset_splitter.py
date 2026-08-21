import os
import csv
import json
import random
from datetime import datetime
from typing import List, Dict, Any, Tuple


def stratified_split_dataset(
    dataset_rows: List[Dict[str, Any]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_seed: int = 42,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Performs stratified train/validation/test split on dataset rows, preserving binary label_target distribution.
    Reproducible using random_seed.
    """
    rng = random.Random(random_seed)

    pos_rows = [r for r in dataset_rows if r.get("label_target") == 1]
    neg_rows = [r for r in dataset_rows if r.get("label_target") == 0]

    rng.shuffle(pos_rows)
    rng.shuffle(neg_rows)

    def split_list(lst):
        n = len(lst)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        train_part = lst[:n_train]
        val_part = lst[n_train:n_train + n_val]
        test_part = lst[n_train + n_val:]
        return train_part, val_part, test_part

    pos_train, pos_val, pos_test = split_list(pos_rows)
    neg_train, neg_val, neg_test = split_list(neg_rows)

    train_rows = pos_train + neg_train
    val_rows = pos_val + neg_val
    test_rows = pos_test + neg_test

    rng.shuffle(train_rows)
    rng.shuffle(val_rows)
    rng.shuffle(test_rows)

    return train_rows, val_rows, test_rows


def export_split_datasets(
    dataset_rows: List[Dict[str, Any]],
    output_dir: str,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_seed: int = 42,
    dataset_version: str = "synthetic-v1",
    label_strategy: str = "suitability-v1",
) -> Dict[str, Any]:
    """
    Splits dataset into train/val/test CSVs and generates dataset_metadata.json in output_dir.
    """
    os.makedirs(output_dir, exist_ok=True)

    train_rows, val_rows, test_rows = stratified_split_dataset(
        dataset_rows, train_ratio, val_ratio, test_ratio, random_seed
    )

    headers = list(dataset_rows[0].keys())

    def save_csv(file_path, rows):
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)

    full_csv_path = os.path.join(output_dir, "full_dataset.csv")
    train_csv_path = os.path.join(output_dir, "train.csv")
    val_csv_path = os.path.join(output_dir, "val.csv")
    test_csv_path = os.path.join(output_dir, "test.csv")

    save_csv(full_csv_path, dataset_rows)
    save_csv(train_csv_path, train_rows)
    save_csv(val_csv_path, val_rows)
    save_csv(test_csv_path, test_rows)

    def calc_pos_pct(rows):
        if not rows:
            return 0.0
        pos = sum(1 for r in rows if r.get("label_target") == 1)
        return round((pos / len(rows)) * 100.0, 2)

    metadata = {
        "dataset_version": dataset_version,
        "label_strategy": label_strategy,
        "generation_timestamp": datetime.utcnow().isoformat() + "Z",
        "random_seed": random_seed,
        "feature_count": len(headers) - 3, # Excluding IDs & Titles
        "total_rows": len(dataset_rows),
        "split_ratios": {
            "train": train_ratio,
            "validation": val_ratio,
            "test": test_ratio,
        },
        "split_sizes": {
            "full": len(dataset_rows),
            "train": len(train_rows),
            "validation": len(val_rows),
            "test": len(test_rows),
        },
        "positive_label_percentage": {
            "full": calc_pos_pct(dataset_rows),
            "train": calc_pos_pct(train_rows),
            "validation": calc_pos_pct(val_rows),
            "test": calc_pos_pct(test_rows),
        },
        "files": {
            "full_dataset": "full_dataset.csv",
            "train": "train.csv",
            "validation": "val.csv",
            "test": "test.csv",
        },
    }

    metadata_path = os.path.join(output_dir, "dataset_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata
