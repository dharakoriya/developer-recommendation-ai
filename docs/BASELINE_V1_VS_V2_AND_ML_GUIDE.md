# DevAlign AI — Baseline-v1 vs Baseline-v2 & ML Master Guide

## 1. Simple Plain-Language Explanation

Think of DevAlign AI like a **smart job-matching system** for software engineering teams:

- **Baseline-v1**: The original 6-factor mathematical formula that scored developers from 0 to 100 based on Skill Match (35%), Coverage (15%), Workload (20%), Performance (15%), Experience (10%), and Availability (5%).
- **Baseline-v2**: The upgraded 7-factor mathematical engine currently active in production. It scores developers on Skill Proficiency (30%), Skill Coverage (15%), Workload & Anti-Monopoly Penalty (15%), Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%). It also enforces strict eligibility rules (`ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, `INELIGIBLE`).
- **Trained ML Models (Random Forest & XGBoost)**: Experimental Machine Learning models trained inside the `research/` directory on research datasets. They exist in the **Research & ML Lab** to test whether AI can match baseline-v2 and to generate SHAP feature attributions.

---

## 2. Flow Diagrams

### RESEARCH SIDE (Offline Machine Learning Pipeline)

```
Synthetic / Real-World Dataset
               │
               ▼
 Ground-Truth Labels & Feature Splits (train/val/test)
               │
               ▼
 5-Fold Stratified CV Training (Random Forest & XGBoost)
               │
               ▼
 Validation Selection & Test Evaluation (ROC-AUC, PR-AUC)
               │
               ▼
 Global SHAP Feature Importance Attributions
               │
               ▼
 Research Findings & Model Governance Dashboard (/research/ml)
```

### PRODUCTION SIDE (Live Developer Recommendation Engine)

```
Project Requirement / Task
               │
               ▼
 Task Weight Engine (Complexity, Priority, Effort, Skill Difficulty) -> Weight 0-100
               │
               ▼
 Active Developer Candidates & Skill Matrices
               │
               ▼
 Baseline-v2 Engine (7 Transparent Factors + Hard Eligibility Rules)
               │
               ▼
 Ranked Compatibility Recommendations & SHAP-like Explanations
               │
               ▼
 Human Manager Review & Task Assignment
```

> **CONNECTION STATUS**: The Production Side (`baseline-v2`) and Research Side (`research/ml`) operate in **isolated parallel tracks**. Baseline-v2 generates all live production recommendations without calling trained ML models.

---

## 3. Answers to 20 Crucial Questions

1. **What is baseline-v1?**
   Legacy 6-factor deterministic scoring algorithm preserved for historical comparison.
2. **What is baseline-v2?**
   Active production developer recommendation engine combining 7 transparent mathematical factors and hard eligibility rules.
3. **Is baseline-v1 a machine-learning model?**
   No. It is a deterministic Python algorithm.
4. **Is baseline-v2 a machine-learning model?**
   No. It is a deterministic Python algorithm.
5. **Where is the trained ML model?**
   Stored as joblib files (`random_forest.joblib`, `xgboost.joblib`) in `research/ml/artifacts/`.
6. **Was the ML model actually trained?**
   Yes. `research/ml/pipeline_ml.py` trained Random Forest and XGBoost models using 5-fold cross-validation.
7. **What dataset was used?**
   Synthetic dataset splits (`train.csv`, `val.csv`, `test.csv`) generated in `research/dataset/processed/`.
8. **What features were used?**
   Selected candidate feature vectors including skill match, coverage ratio, workload score, experience years, performance score, task weight, and availability status.
9. **What was the purpose of training it?**
   To benchmark ML predictive accuracy against baseline-v2 and analyze SHAP feature attributions.
10. **Is the trained model currently used in production recommendations?**
    No. Production exclusively uses `baseline-v2`.
11. **If not, WHY did we train it?**
    To answer the research question of whether ML can reliably predict developer success, to validate dataset quality, and to extract SHAP explainability matrices.
12. **What research question does it answer?**
    "Can a supervised ML model accurately rank developer candidates while remaining fully explainable through SHAP attributions?"
13. **What is the relationship between Dataset → Training → Evaluation → SHAP → Research?**
    It is the offline research pipeline that builds, validates, and explains candidate ML models.
14. **What is the relationship between Task → Developer data → baseline-v2 → Recommendation?**
    It is the live operational workflow that ranks developers for task assignment in real-time.
15. **Why is baseline-v2 useful if it does not use the trained ML model?**
    Because baseline-v2 is 100% transparent, sub-millisecond fast, 100% audit-safe, and requires zero model training or external dependencies.
16. **Could the trained ML model replace or supplement baseline-v2 later?**
    Yes. The architecture includes `MLRecommendationModelAdapter` as a candidate model for future promotion once real-world datasets reach statistical maturity.
17. **Is that integration currently implemented or only future architecture?**
    Future candidate architecture. Currently, baseline-v2 remains active in production.
18. **What exactly should I say in my Viva if asked: "Where is AI/ML used in your project?"**
    *"DevAlign AI uses a transparent 7-factor deterministic recommendation engine (baseline-v2) for active production task matching, an optional local LLM integration via Ollama for AI Project Planning, and an isolated Research & ML Lab where Random Forest and XGBoost models are trained, evaluated, and explained using SHAP feature attributions."*
19. **What should I say if asked: "Why did you train an ML model if the recommendation engine does not use it?"**
    *"In enterprise software engineering, deploying unexplainable ML directly to production creates risk and bias. We built baseline-v2 for reliable, transparent production recommendations while training ML models in a dedicated Research Lab to benchmark accuracy, extract SHAP explainability, and validate model promotion readiness."*
20. **What is deterministic logic vs machine learning in this project?**
    Deterministic logic (baseline-v2) uses explicit mathematical formulas and business rules. Machine learning (RF/XGB) learns pattern weights from synthetic and observational datasets.
