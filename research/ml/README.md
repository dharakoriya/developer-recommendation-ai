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

---

## 7. SHAP Explainability & Model Attribution (Milestone 12)

### A. What is SHAP?
SHAP (SHapley Additive exPlanations) is a game-theoretic framework that assigns each feature an additive attribution value $\phi_i$ representing its marginal contribution to the prediction output:

$$f(x) = \mathbb{E}[f(X)] + \sum_{i=1}^{M} \phi_i$$

### B. Why Explainability is Required
* **Auditability & Trust**: Provides transparent mathematical explanations for complex non-linear tree ensembles like XGBoost.
* **Safety Verification**: Ensures the ML model relies on valid technical criteria (e.g. `min_proficiency_gap`, `skill_coverage_ratio`) rather than spurious correlations.

### C. Global vs. Local Explanations
* **Global Explanation**: Calculates average absolute SHAP values $\mathbb{E}[|\phi_i|]$ across all 1,500 research dataset samples to rank overall feature importance.
* **Local Explanation**: Decomposes the suitability prediction probability for a single developer-task pair into positive ($\phi_i > 0$) and negative ($\phi_i < 0$) feature attributions.

### D. Difference Between SHAP and Gini Feature Importance
Gini impurity feature importance measures how often a feature split reduces node impurity across trees (always positive, no direction). In contrast, SHAP values provide signed directionality ($\pm$) and preserve additive scale relative to the model base value $\mathbb{E}[f(X)]$.

### E. Research Limitations & Production Safety Notice
> **RESEARCH DISCLAIMER**: These explanations describe the behavior of the research XGBoost model (`ml-v1-rf-xgb`) trained on `synthetic-v1` data under `suitability-v1` ground truth rules. They do not establish real-world recommendation accuracy. Production recommendations remain powered by `deterministic_baseline` (`baseline-v1`).

