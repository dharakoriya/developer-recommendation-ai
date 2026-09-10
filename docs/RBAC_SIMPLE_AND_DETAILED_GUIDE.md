# DevAlign AI — RBAC Simple & Detailed Authorization Guide

## 1. Simple Overview (The Non-Technical Analogy)

DevAlign AI enforces three distinct user roles, structured like an engineering organization:

1. **ADMIN (System Owner & Administrator)**:
   - *Analogy*: The Chief Technology Officer (CTO) or Platform Administrator.
   - *Permissions*: Complete unrestricted control over the platform. Can manage users, create/edit projects, trigger recommendations, view performance analytics, and access the **Research & ML Lab** (dataset monitoring, ML evaluation, and governance logs).

2. **MANAGER (Project Manager / Team Lead)**:
   - *Analogy*: The Engineering Project Manager or Scrum Master.
   - *Permissions*: Operates all production delivery workflows. Can create/edit projects, teams, tasks, assign developers, run AI Project Planning, and generate developer recommendations. **CANNOT** access Research & ML Lab, dataset monitoring, or compliance governance logs.

3. **DEVELOPER (Engineering Contributor)**:
   - *Analogy*: The Software Engineer completing tasks.
   - *Permissions*: Dedicated **Developer Workspace**. Can view assigned tasks, update personal skill proficiencies, view personal workload score, performance analytics, streaks, achievements, and incentive rewards. **CANNOT** create projects, assign tasks to others, run AI planning, view system-wide recommendations, or access research tools.

---

## 2. Complete Authorization Matrix

| Feature / Action | API Route | ADMIN | MANAGER | DEVELOPER |
| :--- | :--- | :--- | :--- | :--- |
| **View Dashboard Summary** | `GET /api/dashboard/summary` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Sees personal metrics) |
| **View Workload Distribution** | `GET /api/dashboard/workload` | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **List Projects** | `GET /api/projects` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Create Project** | `POST /api/projects` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Edit / Delete Project** | `PUT/DELETE /api/projects/{id}` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **List Teams** | `GET /api/teams` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Create / Update Teams** | `POST/PUT /api/teams` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **List Developers** | `GET /api/developers` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Update Developer Profile** | `PUT /api/developers/{id}` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Self-profile only) |
| **Update Developer Skills** | `POST/PUT /api/developers/{id}/skills` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Self-profile only) |
| **List Tasks** | `GET /api/tasks` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Sees assigned tasks) |
| **Create / Edit Task** | `POST/PUT /api/tasks` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Update Task Status** | `PATCH /api/tasks/{id}/status` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Assigned tasks) |
| **Generate Recommendations** | `GET /api/recommendations/task/{id}` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Accept Recommendation** | `POST /api/recommendations/feedback` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Assign Task to Developer** | `POST /api/assignments` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **AI Project Planning** | `POST /api/ai-planning/generate` | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Performance Analytics** | `GET /api/performance/*` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Personal performance) |
| **Incentives & Streaks** | `GET /api/incentives/*` | ✅ Allowed | ✅ Allowed | ✅ Allowed (Personal ledger) |
| **Research ML Evaluation** | `GET /api/recommendations/research/ml/*` | ✅ Allowed | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Research Dataset Statistics** | `GET /api/recommendations/research/dataset/*` | ✅ Allowed | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Recommendation Governance Log**| `GET /api/recommendations/audit` | ✅ Allowed | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |

---

## 3. Enforcement Implementation Truth

- **Backend Authorization Authority**: Every endpoint uses FastAPI dependencies (`require_roles(UserRole.ADMIN, UserRole.MANAGER)` in `app/api/deps.py`). Frontend link hiding is **never** relied upon as the sole security boundary; direct HTTP requests using unauthorized Bearer tokens fail with `403 Forbidden`.
- **Frontend Navigation Protection**: `getFilteredNavigation(role)` in `frontend/lib/navigation.ts` and `hasPermission(role, path)` in `frontend/lib/permissions.ts` dynamically filter sidebar links and guard Client-Side Next.js routes.
