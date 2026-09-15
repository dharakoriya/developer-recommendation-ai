# DevAlign AI — Recommendation Engine & Model Governance Guide

## 1. Core Principles

1. **Deterministic Production Recommenders**:
   - DevAlign AI production recommendations are computed deterministically using weighted multi-criteria decision algorithms.
   - This ensures 100% auditable, explainable, and reproducible candidate rankings for real engineering teams.
2. **Clear Separation of Research ML**:
   - Machine Learning models (Random Forest, XGBoost) and SHAP explainability exist solely in the `/research` track for offline experimentation, synthetic data benchmarking, and research publication.
   - Research models do not replace production baselines without explicit architectural promotion.

---

## 2. Recommendation Models Comparison

| Criterion | Baseline-v1 (Legacy) | Baseline-v2 (Current Production) |
|---|---|---|
| **Skill Match** | 35% | 30% |
| **Skill Coverage** | 15% | 15% |
| **Workload Balancing** | 20% | 15% (includes anti-monopoly penalties) |
| **Availability** | 5% | 10% |
| **Experience** | 10% | 10% |
| **Developer Performance** | 15% | 10% |
| **Task Weight Compatibility** | — | 10% (Complexity vs. Seniority fit) |
| **Total Weight** | 100% | 100% |
| **Exclusion Logic** | Workload > 100% or Unavailable | Workload > 100% or Unavailable |

---

## 3. How to Switch Production Recommendation Models

DevAlign AI supports instant, zero-code-modification switching between Baseline-v1 and Baseline-v2 via environment configuration:

### Method A: Via `.env` (Recommended for Local Dev & Deployments)
In `backend/.env`:
```env
# Change from baseline-v2 to baseline-v1
RECOMMENDATION_MODEL=baseline-v1
```
Restart or reload FastAPI — the backend and frontend immediately reflect the selected model.

### Method B: Via API Parameter (For Side-by-Side Comparison)
Managers and Admins can query recommendations for a specific model on-the-fly:
```http
GET /api/recommendations/tasks/{task_id}?model_version=baseline-v1
```

---

## 4. Viva Explanations Checklist

- **Q: Why is Baseline-v2 deterministic instead of an end-to-end black-box neural network?**
  *A: In enterprise task assignment, managers require transparent justification (e.g. why Dev A was chosen over Dev B) and hard eligibility constraints (preventing overload or assigning unavailable devs). Deterministic multi-criteria scoring provides 100% mathematical auditability.*

- **Q: Where is Machine Learning used in DevAlign AI?**
  *A: In the Research & ML Lab (`/research`). We trained Random Forest and XGBoost classifiers on a 1,000-sample dataset, generated TreeSHAP feature importance plots, and benchmarked predictive accuracy (98%) against our deterministic baselines.*
