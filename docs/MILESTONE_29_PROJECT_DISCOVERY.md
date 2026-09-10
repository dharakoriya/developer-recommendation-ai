# DevAlign AI — Milestone 29 Complete Project Discovery

This document details the actual system architecture, component locations, data dependencies, and feature boundaries discovered during the read-only audit of the DevAlign AI repository.

---

## 1. Actual System Architecture

```
                               ┌───────────────────────────┐
                               │  Frontend Client (Next.js)│
                               └─────────────┬─────────────┘
                                             │ REST API / JSON (Bearer JWT)
                                             ▼
                               ┌───────────────────────────┐
                               │   Backend API (FastAPI)   │
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
   ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
   │ Core Services         │    │ AI Planning Providers │    │ Research & ML Lab     │
   │ - Workload Engine     │    │ - Heuristic (Default) │    │ - Synthetic Datasets  │
   │ - Task Weighting      │    │ - Ollama (Local LLM)  │    │ - RF & XGBoost Models │
   │ - Baseline-v2 Engine  │    │ - OpenAI (Cloud LLM)  │    │ - Global SHAP Expl.   │
   │ - Performance & Streaks│   └───────────────────────┘    │ - Real-World Pipeline │
   │ - Risk Assessment     │                                 └───────────────────────┘
   └───────────┬───────────┘                                              │
               │ SQLAlchemy ORM                                           │ Physical Files
               ▼                                                          ▼
   ┌───────────────────────┐                                 ┌───────────────────────┐
   │ PostgreSQL Database   │                                 │ research/ml/artifacts/│
   │ (users, tasks, etc.)  │                                 │ (.joblib & .json)     │
   └───────────────────────┘                                 └───────────────────────┘
```

---

## 2. Component Location & Implementation Map

| System Component | File Path / Directory Location | Implementation Type | Data Source / Dependency |
| :--- | :--- | :--- | :--- |
| **Authentication & User Roles** | `backend/app/api/auth.py`, `backend/app/api/deps.py` | FastAPI JWT Bearer Auth | PostgreSQL `users` table |
| **Projects & Teams** | `backend/app/api/projects.py`, `backend/app/api/teams.py` | REST API CRUD | PostgreSQL `projects`, `teams`, `team_members` |
| **Developer Profiles & Skills** | `backend/app/api/developers.py`, `backend/app/api/skills.py` | REST API + Sorting/Filtering | PostgreSQL `developer_profiles`, `skills`, `developer_skills` |
| **Tasks & Task Weight Engine** | `backend/app/services/task_weight_service.py`, `backend/app/api/tasks.py` | Deterministic Algorithm (0-100 score) | PostgreSQL `tasks`, `task_skills` |
| **Workload Engine** | `backend/app/services/workload_service.py`, `backend/app/api/workload.py` | Deterministic Capacity Math | PostgreSQL `workload_records`, `assignments`, `tasks` |
| **Baseline-v1 Model (Legacy)** | `backend/app/services/recommendation_service.py` | 6-Factor Deterministic Algorithm | Historical Reference / Audit Log |
| **Baseline-v2 Model (Active)** | `backend/app/services/task_developer_compatibility_service.py` | 7-Factor Deterministic Compatibility Engine | Production Recommendation Engine |
| **AI Project Planner** | `backend/app/services/ai_planning_provider.py` | Polymorphic Provider (Heuristic/Ollama/OpenAI) | Generates structured project delivery plans |
| **Performance & Incentives** | `backend/app/services/performance_service.py`, `backend/app/api/incentives.py` | Deterministic Metrics & Gamification | PostgreSQL `developer_streaks`, `developer_achievements`, `developer_incentive_ledger` |
| **Risk Assessment Engine** | `backend/app/services/risk_assessment_service.py`, `backend/app/api/risk.py` | Multi-Signal Decision Support | PostgreSQL Task, Developer, and Project metrics |
| **Research ML Models (RF/XGB)** | `research/ml/pipeline_ml.py`, `research/ml/train_random_forest.py` | Supervised Scikit-Learn / XGBoost | `research/dataset/processed/*.csv` → `research/ml/artifacts/*.joblib` |
| **Global SHAP Explainability** | `research/ml/explainability/`, `frontend/app/research/ml/` | Offline TreeExplainer Attributions | `research/ml/artifacts/evaluation_metrics.json` |
| **Real-World Dataset Pipeline** | `backend/app/services/realworld_dataset_service.py` | Observational Feature Collector | PostgreSQL `research_observational_features` & `ground_truth_labels` |
| **Recommendation Governance Log**| `backend/app/services/outcome_dataset_service.py` | Immutable Audit Logger | PostgreSQL `recommendation_audits` & `recommendation_feedback` |

---

## 3. Production vs Research Boundaries

1. **Production System (`baseline-v2`)**:
   - Executes 100% deterministically using exact mathematical formulas.
   - Requires zero trained ML model files (`.joblib`), zero training, and zero external API keys.
   - Runs directly inside FastAPI backend services using PostgreSQL operational data.

2. **Research & ML Lab (`research/`)**:
   - Operates in complete isolation from live production recommendations.
   - Trains Random Forest and XGBoost candidate models on research synthetic datasets.
   - Stores model artifacts in `research/ml/artifacts/` and renders metrics on `/research/ml`.
   - Accumulates production feature snapshots and ground-truth outcome labels for future model research.
