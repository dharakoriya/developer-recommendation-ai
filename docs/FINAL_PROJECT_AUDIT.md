# DevAlign AI — Complete System & Project Audit Report

## Executive Summary
This document represents the definitive, verified system audit of **DevAlign AI** — an explainable developer recommendation, workload balancing, and software delivery intelligence system.

All audit results herein are based on the actual PostgreSQL database schema, FastAPI backend services, Next.js frontend pages, deterministic recommendation algorithms, and isolated research ML pipelines.

---

## 1. Complete Project Inventory

| Directory / File Group | Primary Purpose | Code Classification | Production / Deployment Status | Notes & Safe Actions |
|---|---|---|---|---|
| `backend/app/api/` | REST API routes (18 modules) | Production | **REQUIRED** | Powers all backend business logic and endpoints |
| `backend/app/models/` | SQLAlchemy ORM entity definitions (13 files) | Production | **REQUIRED** | Defines PostgreSQL database tables & relationships |
| `backend/app/schemas/` | Pydantic v2 request/response schemas | Production | **REQUIRED** | Validates API payloads and responses |
| `backend/app/services/` | Core business logic, formulas, services | Production | **REQUIRED** | Task weight, workload, compatibility, analytics, timer |
| `backend/app/core/` | Security and JWT token utilities | Production | **REQUIRED** | Token decoding, hashing, role verification |
| `backend/tests/` | 28 Pytest test suites (135 tests) | Testing | **REQUIRED for CI/CD** | Automated unit and integration verification |
| `frontend/app/` | Next.js 14 App Router UI pages | Production | **REQUIRED** | Frontend presentation layer |
| `frontend/components/` | 24 reusable UI components | Production | **REQUIRED** | Modals, badges, cards, shell, indicators |
| `frontend/lib/` | API client, navigation config, permissions | Production | **REQUIRED** | Central frontend RBAC & routing tables |
| `frontend/context/` | AuthContext & ToastContext | Production | **REQUIRED** | Client-side session and notification state |
| `research/ml/` | Random Forest & XGBoost training scripts | Research / Experimental | **ISOLATED** | ML research track; outputs benchmarking artifacts |
| `research/dataset/` | Synthetic & observational dataset pipeline | Research / Experimental | **ISOLATED** | Generates offline CSV datasets for ML training |
| `research/validation/` | SHAP explainability & offline validation | Research / Experimental | **ISOLATED** | Produces SHAP summary and feature attributions |
| `ai-engine/` | Placeholder directory (`.gitkeep`) | Legacy / Unused | **CAN BE ARCHIVED** | All AI planning is inside `backend/app/services/ai_planning_provider.py` |
| `docs/` | System architecture, viva guides, manual testing | Documentation | **REFERENCE ONLY** | Consolidated guides for viva, demo, and audit |

---

## 2. Production vs. Research Track Architecture

```
                                  DEVALIGN AI ARCHITECTURE
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
            PRODUCTION TRACK                                    RESEARCH & ML LAB TRACK
  (Deterministic, Real-Time, Explainable)                    (Offline Experimental Benchmarking)
                    │                                                   │
  • Baseline-v2 (Compatibility Engine 2.0)            • Synthetic Dataset Generator (1,000 samples)
  • Baseline-v1 (Legacy 6-Factor Model)               • Real-world Observational Dataset Logger
  • Dynamic Config: RECOMMENDATION_MODEL              • Random Forest Classifier (Scikit-Learn)
  • Task Weight Scoring (Complexity/Priority/Effort)  • XGBoost Classifier & Hyperparameter Tuning
  • Workload Capacity & Anti-Monopoly Balancing       • SHAP Feature Explainability (Global/Local)
  • Performance Scoring, Streaks & Incentives         • Research Comparison & Governance Registry
  • AI Project Planner (Heuristic / Ollama / OpenAI)  • Isolated in /research (Cannot affect prod)
```

---

## 3. Production Recommendation Engine Audit

### Deterministic Baseline Models
1. **Baseline-v2 (`BaselineV2RecommendationModel`)** — **CURRENT PRODUCTION DEFAULT**
   - **Formulas & Weights**:
     - Skill Match (Proficiency fit): 30%
     - Skill Coverage (Matching required skills): 15%
     - Workload & Anti-Monopoly: 15%
     - Availability Factor: 10%
     - Experience Factor: 10%
     - Developer Performance: 10%
     - Task Weight Compatibility: 10%
   - **Eligibility Filtering**:
     - Ineligible if Availability is `UNAVAILABLE`
     - Ineligible if Workload > 100% (Overloaded)
     - Explanations generated transparently via feature contributions.

2. **Baseline-v1 (`BaselineRecommendationModel`)** — **LEGACY AUDITABLE MODEL**
   - **Formulas & Weights**:
     - Skill Match: 35%
     - Skill Coverage: 15%
     - Workload: 20%
     - Performance: 15%
     - Experience: 10%
     - Availability: 5%

3. **Central Configuration Switch**:
   - Environment variable: `RECOMMENDATION_MODEL=baseline-v2` (or `baseline-v1`) in `backend/.env`.
   - Single point of change in `backend/app/config.py`.
   - API endpoints (`GET /api/recommendations/metadata/model`, `GET /api/recommendations/tasks/{id}`, `GET /api/dashboard/recommendations`) dynamically respect this setting.
   - Frontend UI clearly badges and describes the active production model.

---

## 4. Workload Engine Audit
- **Capacity**: Standard 40.0 hours / week.
- **Availability Adjusters**: `AVAILABLE = 1.0`, `PARTIAL = 0.5`, `UNAVAILABLE = 0.05`.
- **Complexity Multipliers**: `LOW = 1.0x`, `MEDIUM = 1.15x`, `HIGH = 1.3x`.
- **Status Thresholds**:
  - `< 50%`: `AVAILABLE` / `HEALTHY`
  - `50% - 80%`: `BALANCED` / `MODERATE`
  - `80% - 100%`: `HIGH`
  - `> 100%`: `OVERLOADED`
- **Dashboard Workload API Verification**:
  - `GET /api/dashboard/workload` was executed live and returned **200 OK** with structured distribution counts (`healthy_count`, `moderate_count`, `high_count`, `overloaded_count`, and per-developer status).

---

## 5. Team Architecture & Ownership Audit
- **Project**: Has `created_by` (FK to `users.id`), tracking project creator/manager.
- **Team**: Belongs to `Project` via `project_id`. Does **not** have an independent `manager_id` column.
- **TeamMember**: Maps `team_id` and `developer_id`. A developer can belong to multiple teams across projects.
- **Task**: Belongs to `Project` (`project_id`) and optionally a `Team` (`team_id`).

---

## 6. RBAC & Security Audit

| Role | Permitted Access | Restricted Access | Verified Enforcement |
|---|---|---|---|
| **ADMIN** | Full system access: All projects, teams, developers, tasks, assignments, recommendations, analytics, AI planning, governance | None | Backend route dependencies (`require_roles`) + Frontend navigation |
| **MANAGER** | Manage owned projects, create tasks, run recommendations, assign developers, override workload warnings, view project analytics, use AI planner | Cannot modify other managers' unassigned projects if restricted | Backend `require_roles(ADMIN, MANAGER)` on assignments and recommendations |
| **DEVELOPER** | View personal "My Work", personal tasks, live task execution timer (start/pause/resume/complete), personal analytics (`/analytics/me`), profile | Blocked from org analytics (`/analytics/projects`, `/teams`, `/tasks`, `/recommendations`), cannot complete others' tasks | Backend HTTP 403 checks in `analytics.py`, `recommendations.py`, `tasks.py` |

---

## 7. Task Lifecycle & Execution Timer Audit
- **Full End-to-End Cycle**:
  1. `CREATE` (Task created with estimated hours, priority, complexity, required skills)
  2. `TASK WEIGHT` (Calculated deterministically from complexity, priority, effort, skill requirements)
  3. `RECOMMENDATION` (Find Best Developer generates ranked, explainable candidates)
  4. `ASSIGNMENT` (Manager confirms assignment; status becomes `TODO`, developer notified)
  5. `START` (Developer starts task; status becomes `IN_PROGRESS`, `started_at` timestamp recorded)
  6. `TIMER` (Live execution timer tracks `total_actual_seconds` with pause/resume persistence)
  7. `COMPLETE` (Developer completes task; `completed_by` and `completed_at` set, assignment completed)
  8. `METRICS UPDATE` (Workload relieved, developer streaks updated, points awarded in incentive ledger, performance snapshot created, analytics updated).

---

## 8. Summary of Safe Code Cleanups Performed
1. **Unified Recommendation Model Configuration**:
   - Added `RECOMMENDATION_MODEL` in `backend/app/config.py`, `backend/.env`, and `backend/.env.example`.
   - Updated `recommendation_service.py`, `recommendations.py`, and `dashboard.py` to use dynamic model configuration.
2. **Dashboard Recommendation Stats Fix**:
   - Replaced hardcoded `"baseline-v1"` in `dashboard.py` with dynamic query to active model metadata.
3. **Frontend Model Version Display**:
   - Clarified badge in `frontend/app/recommendations/page.tsx` showing active deterministic baseline algorithm.
