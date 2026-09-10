# DevAlign AI — Database vs Model Lifecycle Guide

This guide explicitly details the separation of system components in DevAlign AI and explains what happens when individual layers (PostgreSQL, research datasets, trained ML model files, ai-engine, or Ollama) are reset, deleted, or transferred.

---

## 1. System Layers Overview

DevAlign AI consists of **6 distinct runtime and storage layers**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Production PostgreSQL Database (users, projects, tasks, workload)   │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Research Datasets (research/dataset/processed/*.csv)                │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Trained ML Model Artifacts (research/ml/artifacts/*.joblib)         │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Production Application Source Code (backend/ & frontend/)           │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Local Ollama LLM Models (llama3 model weights in local OS directory)│
├────────────────────────────────────────────────────────────────────────┤
│ 6. Cloud OpenAI API Service (Optional internet-based LLM endpoint)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Direct Answers to Project Owner Questions

### QUESTION 1: "If I clear the PostgreSQL database, will the trained ML model be deleted?"

**NO. Absolutely NOT.**

- PostgreSQL stores **relational operational data** (user accounts, projects, tasks, developer profiles, workload records, persisted recommendations).
- The trained ML model files (`random_forest.joblib`, `xgboost.joblib`, `preprocessor.joblib`) reside as physical files on the filesystem inside `research/ml/artifacts/`.
- Clearing or resetting PostgreSQL drops DB tables, but has **zero impact** on the trained `.joblib` files in `research/ml/artifacts/`.

---

## 3. What Happens If... (Component Failure Impact Matrix)

| Scenario / Action | Frontend Impact | Backend Impact | Baseline-v2 Impact | Research ML Impact | AI Planning Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Clear PostgreSQL Data (`DROP DATABASE` or truncate tables)** | App loads empty state. User must register/login again and re-seed demo data. | Backend routes run cleanly, returning 0 rows. | Works cleanly for new data once developers/tasks are added. | Research scripts unaffected. | AI planning generates plans, but saving requires DB tables. |
| **B. Delete `research/dataset/` files** | No impact on core production pages. | No impact on production APIs (`/api/dashboard`, `/api/recommendations`). | **Zero impact.** Baseline-v2 does not read research CSV files. | Research ML training script fails until dataset is re-generated. | Zero impact. |
| **C. Delete `research/ml/artifacts/*.joblib` files** | No impact on core production pages. | No impact on production APIs. | **Zero impact.** Baseline-v2 is pure Python math code. | Research evaluation page shows empty ML metrics until pipeline re-runs. | Zero impact. |
| **D. Delete `ai-engine/` folder** | No impact on core production pages. | No impact on REST API or recommendations. | Zero impact. | Zero impact. | Zero impact (AI Planning service is implemented in `backend/app/services/ai_planning_provider.py`). |
| **E. Stop / Uninstall Ollama** | No impact on core pages or recommendations. | No impact on REST API. | Zero impact. | Zero impact. | AI Planning automatically falls back to **Heuristic Provider** seamlessly without crashing. |

---

## 4. Portability & Moving DevAlign to Another Laptop

When transferring the DevAlign project folder to a new computer:

1. **PostgreSQL Database**: Will be empty initially on the new machine. Run migrations (`alembic upgrade head`) or seed script (`python scripts/seed_demo_data.py`) to populate demo users, projects, tasks, and skills.
2. **Baseline-v2 Recommendation Engine**: Works **immediately** out of the box. Requires no training, no model downloads, and no external keys.
3. **Research ML Artifacts**: If committed to Git or copied in `research/ml/artifacts/`, they remain available for research benchmarking. Otherwise, running `python research/ml/pipeline_ml.py` generates fresh models in ~5 seconds.
4. **Ollama**: If Ollama is not installed on the new laptop, DevAlign automatically uses its built-in **Heuristic AI Planner**, ensuring 100% functionality without installing any LLM runtime.
