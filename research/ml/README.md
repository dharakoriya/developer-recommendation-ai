# DevAlign AI — Machine Learning Model Training & Evaluation (Milestone 11)

## 1. Executive Summary

Milestone 11 implements the supervised machine learning recommendation model pipeline under `research/ml/`.
Two candidate model architectures are trained, cross-validated, tuned on validation data, and evaluated on isolated test data:

1. **Model A**: **Random Forest Classifier** (`class_weight="balanced"`, `n_estimators=100`)
2. **Model B**: **XGBoost Classifier** (`scale_pos_weight=37.46`, `n_estimators=100`)

---

## 2. Research Objective & Safety Isolation

* **Objective**: Train supervised binary classifiers to predict candidate pair suitability (`label_target` $\in \{0, 1\}$) using Milestone 10's 20 engineered numerical feature attributes.
* **Production Isolation**: Production recommendations continue executing `deterministic_baseline` (`baseline-v1`) via `BaselineRecommendationModel`. The ML models remain **RESEARCH ONLY** candidate models.

---

## 3. Data Split & Test Isolation Policy

* `train.csv` (1,049 rows) $\rightarrow$ Model fitting & 5-Fold Stratified Cross-Validation ONLY.
* `val.csv` (224 rows) $\rightarrow$ Threshold tuning (0.30 - 0.70) & candidate model selection ONLY.
* `test.csv` (227 rows) $\rightarrow$ Isolated final test evaluation ONLY.

---

## 4. Class Imbalance Strategy

The dataset exhibits severe class imbalance (2.60% positive suitable pairs):
* **Random Forest**: `class_weight="balanced"` adjusts weights inversely proportional to class frequencies.
* **XGBoost**: `scale_pos_weight = neg_count / pos_count` ($\approx 37.46$) scales positive gradient updates.

Primary evaluation metrics focus on **PR-AUC (Average Precision)**, **F1-Score**, **Recall**, and **ROC-AUC** rather than accuracy.

---

## 5. Artifact Locations

Saved under `research/ml/artifacts/`:
* `random_forest.joblib` — Trained Random Forest binary model
* `xgboost.joblib` — Trained XGBoost binary model
* `preprocessor.joblib` — StandardScaler fitted on `train.csv`
* `selected_features.json` — Selected 20 feature column list
* `model_metadata.json` — Model version, random seed, training provenance
* `evaluation_metrics.json` — CV, Val, and Test evaluation reports

---

## 6. Execution Instructions

To execute ML model training, cross-validation, threshold tuning, and artifact generation:

```bash
python research/ml/pipeline_ml.py
```
