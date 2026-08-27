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

---

## 6. Recommendation Audit, Human Feedback & Model Governance (Milestone 13)

Milestone 13 creates the production-safe infrastructure needed to transition future ML research from synthetic datasets (`synthetic-v1`) to real-world observational datasets:

1. **Immutable Recommendation Audits**: Every recommendation generation logs a `RecommendationAudit` record in PostgreSQL preserving a complete JSON `feature_snapshot` of the feature vector at recommendation generation time.
2. **Reviewer Feedback Loop**: Captures human reviewer decisions (`ACCEPTED`, `REJECTED`, `IGNORED`, `DEFERRED`) with comments via `POST /api/recommendations/{id}/feedback`.
3. **Assignment Outcome Tracking**: Tracks distinct task assignment lifecycle progression (`RECOMMENDED` ➔ `ACCEPTED` ➔ `ASSIGNED` ➔ `COMPLETED`) via `RecommendationOutcome`.
4. **Model Governance Registry**: Tracks provenance, environment (`production` vs `research`), version, and active status for active production baseline (`baseline-v1`) and experimental research models (`ml-v1-rf-xgb`).
5. **Real-World Training Threshold**: Enforces statutory requirement of at least 200 validated real-world outcomes before attempting real-world ML model training.

---

## 7. Real-World Research Dataset & Label Validation Pipeline (Milestone 14)

Milestone 14 builds the first proper pipeline converting real application observations into a versioned research dataset (`realworld-v1` under `research/dataset/realworld/`):

1. **Prediction-Time Feature Isolation**: Prediction-time `feature_snapshot` captured at recommendation generation time is strictly isolated from post-prediction outcome events (`was_assigned`, `completed_at`, `feedback_decision`) to eliminate temporal leakage.
2. **Weak Research Labeling**: Implements `propose_research_label` applying deterministic rules (`ACCEPTED` + task completed/assigned = `WEAK_LABEL` label 1; `REJECTED` or reassigned = `WEAK_LABEL` label 0; ignored/cancelled = `AMBIGUOUS`).
3. **Human Ground-Truth Validation**: Requires explicit human reviewer sign-off (`POST /api/recommendations/research/dataset/labels/{id}/validate`) to convert `WEAK_LABEL` into `VALIDATED_LABEL`. Only human-validated labels are exported into `validated.csv`.
4. **Data Quality & Leakage Auditing**: Performs automated checks for missing values, duplicate candidate pairs, feature range violations, timestamp ordering, temporal leakage flags (0 flags), and lifecycle state machine consistency (100% valid).
5. **Synthetic vs. Real-World Distribution Comparison**: Compares statistical feature distributions between `synthetic-v1` (1,500 candidate pairs) and `realworld-v1` real-world observations.
6. **Multi-Criteria Training Readiness Assessment**: Evaluates multi-criteria readiness (`NOT_READY`, `REVIEW_REQUIRED`, `READY_FOR_EXPERIMENT`) requiring $\ge 200$ validated labels, positive/negative class representation ($\ge 20$ each), 0 temporal leakage flags, and $\ge 98\%$ feature completeness.
7. **Versioned Dataset Exporter**: `python research/exporters/realworld_exporter.py` generates `observations.csv`, `labeled.csv`, `validated.csv`, and `dataset_metadata.json` under `research/dataset/realworld/`.

---

## 8. Real-World Dataset Collection, Label Accumulation & Research Monitoring (Milestone 15)

Milestone 15 builds real-world research data collection, outcome conversion funnel monitoring, dataset diversity tracking, and versioned snapshot management:

1. **Data Collection Monitoring**: Aggregates observation collection rates by model version, environment, time period (this week/month), feedback decisions, assignment outcomes, weak labels, and human validated labels (`GET /api/recommendations/research/dataset/monitoring`).
2. **Outcome Conversion Funnel**: Tracks recommendation lifecycle progression (`RECOMMENDED` ➔ `ACCEPTED` ➔ `ASSIGNED` ➔ `COMPLETED`) alongside alternate paths (`REJECTED`, `IGNORED`, `DEFERRED`, `REASSIGNED`, `CANCELLED`) with conversion percentage calculations (`GET /api/recommendations/research/dataset/outcomes`).
3. **Label Quality Anomaly Warnings**: Evaluates label coverage rates, validation turnaround time, positive/negative validation ratios, and flags suspicious distribution anomalies (`GET /api/recommendations/research/dataset/label-quality`).
4. **Representation Diversity & Concentration Skew**: Monitors sample representation across unique developers, tasks, projects, complexity, priority, and workload, generating concentration warnings if top developers/projects dominate observations (`GET /api/recommendations/research/dataset/diversity`).
5. **Immutable Versioned Dataset Snapshots**: Persists immutable dataset snapshot records (`RecommendationDatasetSnapshot`) in PostgreSQL and exports JSON metadata to `research/dataset/snapshots/{version}.json`. Existing snapshots are immutable and cannot be overwritten.
6. **Research Dashboard UI**: Next.js Dashboard at `/research/dataset/monitoring` providing real-time data collection metrics, outcome funnels, dataset growth visualizer, diversity panels, and versioned snapshot manager.
