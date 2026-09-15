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

DevAlign AI supports instant, zero-code-modification switching between Baseline-v1 and Baseline-v2 centrally via `backend/.env`:

1. Open `backend/.env`
2. Set:
   ```env
   RECOMMENDATION_MODEL=baseline-v1
   ```
   *or*
   ```env
   RECOMMENDATION_MODEL=baseline-v2
   ```
3. Restart or reload FastAPI.

### Stored Recommendations & Cache Handling:
- When the active model is switched, any existing recommendations in PostgreSQL are automatically detected as a model version mismatch and **regenerated on-the-fly** under the active configured model.
- No database wipe or manual cache purge is required.
- Historical audit logs (`recommendation_audits`) are preserved intact.

---

## 4. Viva Explanations Checklist

- **Q: Why is Baseline-v2 deterministic instead of an end-to-end black-box neural network?**
  *A: In enterprise task assignment, managers require transparent justification (e.g. why Dev A was chosen over Dev B) and hard eligibility constraints (preventing overload or assigning unavailable devs). Deterministic multi-criteria scoring provides 100% mathematical auditability.*

- **Q: Where is Machine Learning used in DevAlign AI?**
  *A: In the Research & ML Lab (`/research`). We trained Random Forest and XGBoost classifiers on a 1,000-sample dataset, generated TreeSHAP feature importance plots, and benchmarked predictive accuracy (98%) against our deterministic baselines.*
