# DevAlign AI — Milestone 27 Final Product & Architecture Guide

**Document Version:** 1.0.0  
**Milestone:** 27 — Final Product Experience & Validation  
**Date:** September 2026  

---

## 1. Executive Summary

DevAlign AI is an enterprise-grade SaaS platform for explainable developer recommendation, project planning, workload balancing, and delivery risk management. Milestone 27 brings complete architecture documentation, a deterministic Risk Assessment Engine, advanced developer sorting & filtering, navigation active-state fixes, and end-to-end product validation.

---

## 2. Platform Architecture & Data Flow

```
+-------------------------------------------------------------------+
|                     Frontend (Next.js 14)                         |
| AppShell, Theme System, Dashboard, Risk Cards, Developer Filters  |
+---------------------------------+---------------------------------+
                                  | REST API
                                  v
+-------------------------------------------------------------------+
|                        Backend (FastAPI)                          |
|  Authentication, RBAC, Services (Workload, Recommendation, Risk)  |
+------------------+------------------------------+-----------------+
                   |                              |
                   v                              v
    +------------------------------+  +---------------------------+
    |      PostgreSQL Database     |  |    AI Planning Engine     |
    | Users, Projects, Tasks,      |  | Heuristic / Local Ollama  |
    | Assignments, Performance     |  | / OpenAI Multi-Provider   |
    +------------------------------+  +---------------------------+

                                  VS

+-------------------------------------------------------------------+
|               ISOLATED RESEARCH ML PIPELINE                       |
| research/dataset (CSV) & research/ml/artifacts (.joblib models)  |
+-------------------------------------------------------------------+
```

### Architecture Safety Rules
1. **Production Engine:** Recommendation uses `baseline-v2` (`BaselineV2RecommendationModel`), combining Skill Match (30%), Skill Coverage (15%), Workload & Anti-Monopoly (15%), Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%).
2. **Research Isolation:** Machine learning models (`Random Forest`, `XGBoost`) are isolated in `research/ml/artifacts/` for offline benchmarking and research evaluation. Production never loads `.joblib` files at runtime.
3. **Database Reset Safety:** Resetting PostgreSQL deletes dynamic operational data in the database only. Filesystem assets in `research/dataset/` and `research/ml/artifacts/` are strictly preserved.

---

## 3. Core Subsystems

### A. Risk Assessment Engine
- **Task Risk:** Evaluates schedule proximity, developer workload %, skill coverage gaps, and complexity score.
- **Developer Delivery Risk:** Evaluates capacity utilization, active concurrency, performance history, and overdue tasks.
- **Project Risk:** Aggregates task risk distribution, progress completion %, top risk drivers, and recommended manager actions.
- **Explainability:** All risk ratings (LOW, MEDIUM, HIGH, CRITICAL) provide explicit human-readable reasons.

### B. Developer Intelligence & Filtering
- **Whitelisted Sorting:** Supports safe server-side sorting by `Name`, `Experience`, `Performance Score`, `Workload %`, `Availability`, `Task Completion Rate`, and `Productivity Score`.
- **Filtering:** Filters by availability status (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`), performance tier, experience range, and required skills.

### C. Sidebar Navigation & Theme System
- **Single Active Route:** Longest route prefix matching eliminates parent/child double-highlighting bug.
- **Theme Integrity:** Semantic theme variables ensure contrast and readability in Light Mode and Dark Mode.

### D. Role-Based Access Control (RBAC)
- **ADMIN:** Full system access, audit logs, ML research lab, risk summaries, developer/project controls.
- **MANAGER:** Team & project management, AI planning, task assignment, project/developer risk visibility.
- **DEVELOPER:** Personal task workspace, capacity workload metrics, performance & incentive points, personal delivery risk profile. Direct backend API authorization guards restricted routes.

---

## 4. Operational Troubleshooting & Verification

### Running Automated Verification Commands
```bash
# 1. Backend Pytest Suite
cd backend
.\venv\Scripts\python -m pytest

# 2. Frontend TypeScript Type Checker
cd ../frontend
npx tsc --noEmit
```

### Database Reset & Seeding
```bash
cd backend
python reset_db.py
python seed_db.py
```
