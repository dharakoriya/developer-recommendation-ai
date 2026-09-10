# DevAlign AI — Research & ML Lab Final Guide

The Research & ML Lab comprises **4 pages** accessible to Admins:

1. **ML Model Evaluation & SHAP** (`/research/ml`): Displays cross-validation metrics and global SHAP feature importance rankings for candidate Random Forest & XGBoost models.
2. **Research Dataset & Label Validation** (`/research/dataset`): Inspects observational data quality, class imbalance ratios, and multi-criteria training readiness.
3. **Dataset & Collection Monitoring** (`/research/dataset/monitoring`): Tracks observation accumulation over time and outcome conversion funnels.
4. **Recommendation Audit & Governance Log** (`/recommendations/audit`): Immutable audit trail recording timestamps, model versions, candidate scores, and feature snapshots.

---

## Relationship Between Research & Production

```
              ┌──────────────────────────────────────────────┐
              │          Production System (Live DB)         │
              └──────────────────────┬───────────────────────┘
                                     │ Captures Feature Snapshots
                                     ▼
              ┌──────────────────────────────────────────────┐
              │      Observational & Ground-Truth Tables    │
              └──────────────────────┬───────────────────────┘
                                     │ Export & Split
                                     ▼
              ┌──────────────────────────────────────────────┐
              │     Research Dataset (research/dataset/)     │
              └──────────────────────┬───────────────────────┘
                                     │ Offline Pipeline Training
                                     ▼
              ┌──────────────────────────────────────────────┐
              │   ML Evaluation & SHAP (research/ml/artifacts)│
              └──────────────────────────────────────────────┘
```
