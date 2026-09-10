# DevAlign AI — Database vs Model Lifecycle Guide

**Document Version:** 1.0.0  
**Milestone:** 27 — Database & Model Safety Audit  
**Date:** September 2026  

---

## 1. Executive Summary

This guide details the explicit boundary between PostgreSQL operational data and filesystem-stored ML artifacts / research datasets in DevAlign AI.

> [!IMPORTANT]
> **Database Safety Guarantee:** Resetting, clearing, or re-initializing the PostgreSQL development database does **NOT** delete, corrupt, or alter any trained machine learning model files, datasets, or research artifacts.

---

## 2. System Architecture & Lifecycle Boundary

```
+-----------------------------------------------------------------------+
|                         PostgreSQL DATABASE                           |
|  (Dynamic operational database — safely resettable via DB seed/reset) |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- users                      +-- tasks                             |
|  +-- developers                 +-- task_skills                       |
|  +-- teams                      +-- assignments                       |
|  +-- skills                     +-- recommendations                   |
|  +-- developer_skills           +-- ai_plans                          |
|  +-- projects                   +-- ai_plan_tasks                     |
|                                 +-- performance_records               |
|                                 +-- incentive_points                  |
|                                 +-- audit_logs                        |
+-----------------------------------------------------------------------+

                                  VS

+-----------------------------------------------------------------------+
|                      SEPARATE FILESYSTEM STORAGE                      |
| (Persistent, file-based research assets — NEVER affected by DB resets)|
+-----------------------------------------------------------------------+
|                                                                       |
| research/                                                             |
|   ├── dataset/                                                        |
|   │     ├── synthetic_dev_assignments.csv                             |
|   │     ├── train_dataset.csv                                         |
|   │     └── test_dataset.csv                                          |
|   └── ml/                                                             |
|         └── artifacts/                                                |
|               ├── preprocessor.joblib                                 |
|               ├── random_forest.joblib                                |
|               ├── xgboost.joblib                                      |
|               ├── evaluation_metrics.json                             |
|               ├── model_metadata.json                                 |
|               ├── selected_features.json                              |
|               └── shap_global_importance.json                         |
+-----------------------------------------------------------------------+
```

---

## 3. Categorical Inventory & Persistence Lifecycle

### A. Data Stored Inside PostgreSQL Database
- User credentials & roles (`users`).
- Active developer profiles & skills (`developers`, `skills`, `developer_skills`).
- Projects, teams, and live tasks (`projects`, `teams`, `tasks`, `task_skills`).
- Historical task assignments and active workload allocations (`assignments`).
- Baseline-v2 recommendation logs and SHAP explanation snapshots (`recommendations`, `recommendation_explanations`).
- AI Project Planner draft and approved plans (`ai_plans`, `ai_plan_tasks`).
- Developer performance metrics, completed task scores, and incentive rewards (`performance_records`, `incentive_points`, `user_achievements`).

### B. Artifacts Stored on the Local Filesystem
- **Datasets (`research/dataset/`):** CSV datasets used for offline machine learning model training and research benchmarking.
- **ML Artifacts (`research/ml/artifacts/`):**
  - `random_forest.joblib`: Serialized Random Forest Regressor/Classifier model.
  - `xgboost.joblib`: Serialized XGBoost model.
  - `preprocessor.joblib`: StandardScaler / OneHotEncoder pipelines.
  - `evaluation_metrics.json`: Offline cross-validation scores ($R^2$, MAE, RMSE, Accuracy).
  - `shap_global_importance.json`: Extracted SHAP feature rankings for research comparison.

---

## 4. Production vs Research Model Loading

1. **Production Engine:** DevAlign AI's live recommendation API uses **`baseline-v2`** (`BaselineV2RecommendationModel`). This engine evaluates candidates using deterministic mathematical weightings and does not load `.joblib` files from disk.
2. **Research Engine:** Offline ML research models (`RandomForest`, `XGBoost`) are benchmarked against `baseline-v2` in the `research/` module to evaluate predictive quality.

---

## 5. Safe Database Reset Procedure

To safely reset the development database without affecting model artifacts or datasets:

```bash
# 1. Reset PostgreSQL database tables using backend reset script
cd backend
python reset_db.py

# 2. Seed initial controlled dataset for testing
python seed_db.py
```

### Files Protected from Database Reset:
- `research/dataset/*`
- `research/ml/artifacts/*`
- `.env` and configuration files.
