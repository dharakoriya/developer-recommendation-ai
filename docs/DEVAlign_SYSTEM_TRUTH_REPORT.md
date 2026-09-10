# DevAlign AI — System Truth Report

This document presents an unvarnished audit of the DevAlign AI codebase. It clarifies what is documented, what is actually implemented in source code, where features reside, whether they are used by production or research only, and their current runtime verification status.

---

## Executive Feature Inventory & System Truth Matrix

| Feature | Status | Implemented Where | Production vs Research | Database Dependent | External API Required | Runtime Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & JWT** | Fully Implemented | `backend/app/api/auth.py`, `backend/app/core/security.py`, `frontend/app/context/AuthContext.tsx` | Production | Yes (PostgreSQL `users`) | No | Verified (JWT Bearer tokens, password hashing) |
| **RBAC Authorization** | Fully Implemented | `backend/app/api/deps.py`, `backend/app/api/*.py`, `frontend/lib/permissions.ts` | Production | Yes (`users.role`) | No | Verified (ADMIN, MANAGER, DEVELOPER enforced at API & UI) |
| **Projects & Teams** | Fully Implemented | `backend/app/api/projects.py`, `backend/app/api/teams.py`, `frontend/app/projects/`, `frontend/app/teams/` | Production | Yes (`projects`, `teams`, `team_members`) | No | Verified |
| **Developers & Skills** | Fully Implemented | `backend/app/api/developers.py`, `backend/app/api/skills.py`, `frontend/app/developers/` | Production | Yes (`developer_profiles`, `skills`, `developer_skills`) | No | Verified (CRUD + proficiency matrix) |
| **Tasks & Task Weight** | Fully Implemented | `backend/app/api/tasks.py`, `backend/app/services/task_weight_service.py`, `frontend/app/tasks/` | Production | Yes (`tasks`, `task_skills`) | No | Verified (Complexity, Priority, Effort, Skill Difficulty -> Task Weight 0-100) |
| **Workload Engine** | Fully Implemented & Fixed | `backend/app/services/workload_service.py`, `backend/app/api/workload.py`, `backend/app/api/dashboard.py`, `frontend/app/workload/` | Production | Yes (`workload_records`, `assignments`, `tasks`) | No | Verified (HTTP 500 error resolved; score = weighted_hours / capacity * 100) |
| **Baseline-v1 Model** | Implemented (Historical) | `backend/app/services/recommendation_service.py` (`BaselineRecommendationModel`) | Historical Audit | Yes | No | Verified (6-factor score, legacy reference) |
| **Baseline-v2 Model** | Fully Implemented (Active) | `backend/app/services/recommendation_service.py` (`BaselineV2RecommendationModel`), `backend/app/services/task_developer_compatibility_service.py` | Production | Yes (`developer_profiles`, `workload_records`, `tasks`) | No | Verified (Active production recommendation engine; 7 transparent factors) |
| **AI Project Planner** | Fully Implemented | `backend/app/services/ai_planning_provider.py`, `backend/app/api/ai_planning.py`, `frontend/app/ai-planning/` | Production | Yes (`ai_generated_plans`, `tasks`, `projects`) | Optional (OpenAI/Ollama; defaults to Heuristic) | Verified (Heuristic, Ollama, OpenAI providers supported with automatic fallback) |
| **Performance & Incentives** | Fully Implemented | `backend/app/services/performance_service.py`, `backend/app/api/performance.py`, `backend/app/api/incentives.py` | Production | Yes (`developer_streaks`, `developer_achievements`, `developer_incentive_ledger`) | No | Verified (Completion rate, on-time rate, productivity, streaks, achievements, points) |
| **Risk Assessment** | Fully Implemented | `backend/app/services/risk_assessment_service.py`, `backend/app/api/risk.py`, `frontend/components/RiskCard.tsx` | Production | Yes | No | Verified (Task, Developer, Project risk levels: LOW, MEDIUM, HIGH, CRITICAL) |
| **Developer Sorting** | Fully Implemented | `backend/app/api/developers.py`, `frontend/app/developers/page.tsx` | Production | Yes | No | Verified (Sort by Name, Experience, Performance, Workload, Availability, Completion, Productivity) |
| **Research ML Models (RF/XGB)** | Fully Implemented | `research/ml/`, `backend/app/api/recommendations.py` (`/research/ml/*`) | Research Only | No (Uses `research/dataset/processed/`) | No | Verified (Random Forest & XGBoost trained on research synthetic split; artifacts in `research/ml/artifacts/`) |
| **Global SHAP Explainability** | Fully Implemented | `research/ml/explainability/`, `frontend/app/research/ml/page.tsx` | Research Only | No | No | Verified (Offline SHAP attributions displayed in Research & ML Lab) |
| **Real-World Dataset Pipeline** | Fully Implemented | `backend/app/services/realworld_dataset_service.py`, `frontend/app/research/dataset/` | Research Data Collection | Yes (`research_observational_features`, `ground_truth_labels`) | No | Verified (Accumulates production observations & ground-truth outcome labels) |
| **Recommendation Governance Log** | Fully Implemented | `backend/app/services/outcome_dataset_service.py`, `frontend/app/recommendations/audit/` | Production Audit & Governance | Yes (`recommendation_audits`, `recommendation_feedback`) | No | Verified (Immutable logs of recommendation predictions, scores, and feedback) |

---

## Detailed System Component Breakdown

### 1. Recommendation Engine (baseline-v1 vs baseline-v2 vs Research ML)
- **Production Recommendation Model**: `baseline-v2` (`BaselineV2RecommendationModel` invoking `evaluate_task_developer_compatibility`).
- **Nature of baseline-v2**: Deterministic, rule-based transparent mathematical scoring algorithm (0 to 100). It is **NOT** a trained ML model and requires **NO** `.joblib`/`.pkl` artifacts.
- **Nature of baseline-v1**: Legacy 6-factor deterministic scoring algorithm. Kept for historical reproduction and benchmarking.
- **Research ML Models**: Random Forest (`random_forest.joblib`) and XGBoost (`xgboost.joblib`) trained inside `research/ml/` on synthetic datasets (`research/dataset/processed/`). They exist to benchmark ML against baseline-v2 and explore potential future ML adoption. They are **NOT** connected to live production recommendation routes.

### 2. AI Planning Engine & External Providers
- **Provider Architecture**: Polymorphic `AIPlanningProvider` interface with three implementations:
  1. `HeuristicPlanningProvider`: Fast, offline, deterministic software project plan generator. **DEFAULT**.
  2. `OllamaPlanningProvider`: Connects to local Ollama instance (`http://localhost:11434`). Falls back to Heuristic if Ollama is unavailable.
  3. `OpenAIPlanningProvider`: Connects to OpenAI REST API using `AI_API_KEY` / `OPENAI_API_KEY`. Falls back to Heuristic if API key is missing or call fails.

### 3. Database vs Model Artifact Lifecycle
- **PostgreSQL Database**: Stores operational business entities (`users`, `projects`, `teams`, `developer_profiles`, `tasks`, `assignments`, `workload_records`, `recommendations`, `ai_generated_plans`). Deleting PostgreSQL clears application state but does **NOT** delete trained ML model artifacts or Ollama local models.
- **Trained ML Artifacts**: Stored as `.joblib` and `.json` files in `research/ml/artifacts/`. They are independent of PostgreSQL.
- **Ollama Local LLM Models**: Stored locally in Ollama's storage directory (e.g. `~/.ollama/models`). Independent of DevAlign repository and database.

---

## Audit Conclusion & Next Steps
- Production engine (`baseline-v2`) is fully deterministic, transparent, and operational.
- Research pipeline operates in full isolation without impacting production stability.
- All endpoints, sorting, risk assessments, and Light/Dark themes are verified.
