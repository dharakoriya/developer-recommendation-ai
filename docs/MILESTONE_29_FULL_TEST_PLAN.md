# DevAlign AI — Milestone 29 Full Test Plan

This test plan defines exact functional test cases derived directly from source code capabilities across backend API routes, services, baseline-v2 recommendation engine, workload engine, risk assessment, RBAC, theme system, and Research & ML Lab.

---

## Complete Test Inventory Matrix

| Test ID | Feature Area | User Role | Preconditions | Test Data / Input | Execution Steps | Expected Result | API Endpoint | DB Tables Involved |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | User Authentication | Guest | User registered | `admin@devalign.ai` / `admin123` | Send login request to `/api/auth/login` | Returns HTTP 200 with JWT access token & user object | `POST /api/auth/login` | `users` |
| **TC-AUTH-02** | Token Verification | Authenticated | Active JWT Token | Bearer JWT Header | Send request to `/api/auth/me` | Returns current user profile with role `ADMIN` | `GET /api/auth/me` | `users` |
| **TC-RBAC-01** | Admin Research Access | ADMIN | Authenticated Admin | Bearer JWT | Access `/api/recommendations/research/ml/metrics` | Returns HTTP 200 with ML evaluation metrics | `GET /api/recommendations/research/ml/metrics` | N/A (JSON File) |
| **TC-RBAC-02** | Manager Research Restriction | MANAGER | Authenticated Manager | Bearer JWT | Access `/api/recommendations/research/ml/metrics` | Returns HTTP 403 Forbidden | `GET /api/recommendations/research/ml/metrics` | N/A |
| **TC-RBAC-03** | Developer Project Guard | DEVELOPER | Authenticated Developer | Bearer JWT | Access `POST /api/projects` | Returns HTTP 403 Forbidden | `POST /api/projects` | `projects` |
| **TC-PROJ-01** | Project Creation | MANAGER | Authenticated Manager | Project Name, Description | Send POST to `/api/projects` | Returns HTTP 201 Created with Project ORM model | `POST /api/projects` | `projects` |
| **TC-DEV-01** | Developer Sorting | MANAGER | Seeded Developers | `sort_by=experience`, `sort_order=desc` | Send GET to `/api/developers?sort_by=experience&sort_order=desc` | Returns developers sorted by experience descending | `GET /api/developers` | `developer_profiles`, `users` |
| **TC-TASK-01** | Task Weight Scoring | MANAGER | Project & Skills | Task (Complexity=HIGH, Priority=CRITICAL, Hrs=20) | Create task with required skills | Computes Task Weight Score 87.75 (`CRITICAL`) | `POST /api/tasks` | `tasks`, `task_skills` |
| **TC-REC-01** | Baseline-v2 Ranking | MANAGER | Task created | `task_id` | Call `/api/recommendations/task/{id}` | Returns ranked candidate list with 7-factor explanations & eligibility statuses | `GET /api/recommendations/task/{id}` | `recommendations`, `recommendation_explanations` |
| **TC-WORK-01** | Workload Engine Summary | MANAGER | Active assignments | Bearer JWT | Call `/api/dashboard/workload` | Returns HTTP 200 with healthy/moderate/high counts and developer workloads | `GET /api/dashboard/workload` | `workload_records`, `developer_profiles` |
| **TC-RISK-01** | Task Risk Assessment | MANAGER | Task created | `task_id` | Call `/api/risk/task/{id}` | Returns overall risk level, breakdown, drivers, and recommended action | `GET /api/risk/task/{id}` | `tasks`, `assignments`, `workload_records` |
| **TC-RISK-02** | System Risk Summary | ADMIN | Seeded database | Bearer JWT | Call `/api/risk/summary` | Returns aggregated high/critical risk project, task, and developer counts | `GET /api/risk/summary` | `projects`, `tasks`, `developer_profiles` |
| **TC-AI-01** | Heuristic AI Planner | MANAGER | App configured | Project Description & Type | Call `/api/ai-planning/generate` with `AI_PROVIDER=heuristic` | Returns structured JSON plan with summary, modules, and tasks | `POST /api/ai-planning/generate` | `ai_generated_plans` |
| **TC-PERF-01** | Streaks & Incentives | DEVELOPER | Completed task | Task completed on time | Complete assigned task before deadline | Increments streak counter, grants base + bonus points, unlocks badges | `PATCH /api/tasks/{id}/status` | `developer_streaks`, `developer_incentive_ledger` |
