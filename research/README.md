# DevAlign AI — Research Dataset & Ground-Truth Labeling Pipeline

## 1. Executive Summary

Milestone 10 establishes a reproducible, research-grade synthetic dataset generation, ground-truth labeling, data quality validation, and train/validation/test splitting pipeline in `research/`.

This pipeline converts raw developer, task, skill, and workload attributes into structured candidate feature vectors (`Developer, Task`) paired with a deterministic binary suitability target (`label_target` $\in \{0, 1\}$).

---

## 2. Research Distinction: Feature Extraction vs. Labeled Dataset

* **Milestone 8 (Feature Engineering)**: Extracted candidate feature vectors from PostgreSQL database state with `label_target = NULL`, reflecting that production observational data did not yet contain validated supervised ground-truth labels.
* **Milestone 10 (Research Dataset)**: Establishes a controlled, reproducible research benchmark dataset with deterministic ground-truth labels (`suitability-v1`), enabling supervised ML model training (Random Forest, XGBoost) and evaluation in Milestone 11.

---

## 3. Ground-Truth Labeling Strategy (`suitability-v1`)

To prevent data leakage, `label_target` is generated strictly from raw domain attributes and **does NOT consume or copy the Milestone 9 baseline recommendation score**.

A candidate pair `(Developer, Task)` is defined as suitable (`label_target = 1`) if and only if **all 4 research criteria** are satisfied:

1. **Skill Coverage Criterion**: `skill_coverage_ratio >= 0.60` (Developer possesses at least 60% of required task skills).
2. **Proficiency Deficiency Criterion**: `min_proficiency_gap >= -20.0` (Developer proficiency on any required skill is not more than 20 points below target level).
3. **Workload Capacity Criterion**: `dev_workload_score <= 100.0` (Developer is not currently overloaded).
4. **Availability Criterion**: `dev_availability_status != "UNAVAILABLE"` (Developer has available working capacity).

If any criterion fails, `label_target = 0` (unsuitable).

---

## 4. Dataset Directory Structure & Versioning

```text
research/
├── dataset/
│   ├── raw/
│   ├── generated/
│   └── processed/
│       ├── full_dataset.csv       # Complete candidate pair dataset
│       ├── train.csv              # 70% Stratified Training split
│       ├── val.csv                # 15% Stratified Validation split
│       ├── test.csv               # 15% Stratified Test split (Isolated)
│       └── dataset_metadata.json  # Dataset provenance & version metadata
├── generators/
│   └── synthetic_generator.py     # Bounded, realistic synthetic data generator
├── labeling/
│   └── ground_truth_labeler.py     # Deterministic ground-truth labeling engine
├── validation/
│   └── dataset_validator.py       # Schema & range quality validator
├── split/
│   └── dataset_splitter.py        # Stratified dataset splitter
├── pipeline.py                    # Main pipeline runner
└── README.md
```

### Version Metadata
* `dataset_version`: `synthetic-v1`
* `label_strategy`: `suitability-v1`
* `random_seed`: `42` (100% Reproducible)
* `split_ratios`: Train 70%, Validation 15%, Test 15%

---

## 5. Execution Instructions

To generate and validate the research dataset:

```bash
python research/pipeline.py
```

This populates `research/dataset/processed/` with `train.csv`, `val.csv`, `test.csv`, `full_dataset.csv`, and `dataset_metadata.json`.
