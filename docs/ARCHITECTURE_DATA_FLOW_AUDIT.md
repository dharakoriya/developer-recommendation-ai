# DevAlign AI — Architecture & Data Flow Audit

**Document Version:** 1.0.0  
**Milestone:** 27 — Final Architecture Audit  
**Date:** September 2026  

---

## 1. System Overview & Component Responsibilities

DevAlign AI is an explainable AI-based developer recommendation, project planning, workload balancing, and risk assessment platform. The architecture is modularly separated into production services and isolated research pipelines.

```
                  +-----------------------------------+
                  |      Frontend (Next.js 14)        |
                  | AppShell, Theme System, Dashboard |
                  +-----------------+-----------------+
                                    | REST API (HTTP)
                                    v
                  +-----------------------------------+
                  |       Backend (FastAPI)           |
                  | RBAC, Services, Risk Engine       |
                  +--------+----------------+---------+
                           |                |
             +-------------+                +---------------+
             v                                              v
  +--------------------+                         +--------------------+
  | PostgreSQL Database|                         | AI Planning Engine |
  | Users, Projects,   |                         | Heuristic / Ollama |
  | Tasks, Workload,   |                         | / OpenAI Provider  |
  | Performance, Audit |                         +--------------------+
  +--------------------+
```

### A. Frontend Responsibility (`frontend/`)
- **Technology Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Responsibilities:**
  - Executive dashboard and visualization (charts, metrics, risk cards).
  - Project management UI (`/projects`, `/projects/[id]`, `/projects/new`).
  - Developer intelligence interface (`/developers`, filtering, sorting, cards).
  - AI Project Planner workflow (`/ai-planning`).
  - Task management & manual developer assignment (`/tasks`, `/assignments`).
  - Analytics & performance dashboards (`/analytics`, `/features`).
  - Theme engine state management (Light / Dark mode persistence).
  - Client-side authentication token storage and RBAC navigation guards.

### B. Backend Responsibility (`backend/`)
- **Technology Stack:** Python 3.10+, FastAPI, SQLAlchemy ORM, Pydantic v2.
- **Responsibilities:**
  - REST API endpoint routing (`/api/*`).
  - Authentication, JWT issuance, password hashing (bcrypt), and RBAC authorization enforcement.
  - Business logic services:
    - **`task_weight_score`**: Calculates task complexity and priority weights.
    - **`workload_service`**: Dynamic workload calculation, capacity thresholds, and anti-monopoly factors.
    - **`task_developer_compatibility_service`**: Core scoring for compatibility.
    - **`recommendation_service`**: Implements `baseline-v2` multi-objective scoring and SHAP-like directional explanations.
    - **`risk_assessment_service`**: Deterministic risk engine evaluating Schedule, Workload, Task Progress, Dependency, Skill Gap, and Delivery risk.
    - **`performance_service`**: Tracks developer productivity, quality, SLA compliance, achievements, and incentive rewards.

### C. PostgreSQL Database Responsibility
- **Database Engine:** PostgreSQL 14+.
- **Responsibilities:**
  - Persists operational state: `users`, `developers`, `projects`, `teams`, `tasks`, `task_skills`, `assignments`, `recommendations`, `ai_plans`, `ai_plan_tasks`, `performance_records`, `incentive_points`, `audit_logs`.
  - Transactional consistency and foreign key integrity.

### D. AI Engine Responsibility (`ai-engine/`)
- Directory reserved for standalone AI agent services and sidecar runtimes.
- Currently, production AI planning is integrated directly inside `backend/app/services/ai_planning_provider.py` with multi-provider abstraction (`HeuristicProvider`, `OllamaProvider`, `OpenAIProvider`).

### E. Research Responsibility (`research/`)
- **Location:** `research/` directory.
- **Responsibilities:**
  - Synthetic dataset generation (`research/generators/`), labeling (`research/labeling/`), validation (`research/validation/`), and splitting (`research/split/`).
  - ML model training pipelines (`research/ml/train_random_forest.py`, `research/ml/train_xgboost.py`).
  - Model evaluation & SHAP global feature importance export (`research/ml/evaluate.py`).
  - Research ML artifacts are saved directly to `research/ml/artifacts/`.
  - **ISOLATION:** Research code and ML models are completely isolated from production runtime services. Production uses the `baseline-v2` model in FastAPI.

---

## 2. Specific Architectural Declarations

| Question | Audit Finding / Fact |
|---|---|
| **F. AI planning responsibility** | Handled by `backend/app/services/ai_planning_provider.py`. Provides fallback `HeuristicProvider` (no LLM required), `OllamaProvider` (local LLM), and `OpenAIProvider`. |
| **G. Recommendation responsibility** | Handled by `backend/app/services/recommendation_service.py` using `BaselineV2RecommendationModel` (`baseline-v2`). |
| **H. ML / Research responsibility** | Isolated in `research/ml/`. Trains Random Forest and XGBoost benchmark models for evaluation against baseline-v2. |
| **I. Data movement between systems** | Frontend calls FastAPI via REST. FastAPI queries PostgreSQL via SQLAlchemy. AI Planning calls local heuristic or LLM HTTP endpoints. Research reads/writes local CSV/JSON/joblib files in `research/`. |
| **J. Production vs K. Research** | **Production:** FastAPI (`backend/app`), Next.js (`frontend/app`), PostgreSQL DB. **Research:** `research/` scripts and pipelines. |
| **L. Trained model artifacts existing** | `research/ml/artifacts/random_forest.joblib`, `research/ml/artifacts/xgboost.joblib`, `preprocessor.joblib`, `model_metadata.json`, `evaluation_metrics.json`, `shap_global_importance.json`. |
| **M. Does production load research models?** | **NO.** Production exclusively uses `baseline-v2` (`BaselineV2RecommendationModel`), which is deterministic and requires no external joblib weights at runtime. |
| **N. Clearing PostgreSQL impact on ML files?** | **ZERO IMPACT.** Database resetting affects only PostgreSQL database tables. Trained `.joblib` and `.json` model files reside on the filesystem in `research/ml/artifacts/`. |
| **O. Model artifact location** | `research/ml/artifacts/` |
| **P. Is Ollama optional?** | **YES.** System defaults to `AI_PROVIDER=heuristic`. Ollama is completely optional. |
| **Q. Is OpenAI optional?** | **YES.** OpenAI API key is optional and not required for baseline operation. |
| **R. What baseline-v2 actually uses** | Transparent deterministic multi-objective evaluation combining: Skill Match (30%), Skill Coverage (15%), Workload & Anti-Monopoly (15%), Availability (10%), Experience (10%), Performance (10%), Task Weight Compatibility (10%). |
