# DevAlign AI — RBAC Final Validation

## 1. System Role Definitions

- **ADMIN**: Platform Owner. Full operational authority across projects, teams, developers, tasks, recommendations, AI planning, plus exclusive access to **Research & ML Lab** (`/research/ml`, `/research/dataset`, `/research/dataset/monitoring`) and **Prediction Audit Governance Logs** (`/recommendations/audit`).
- **MANAGER**: Delivery Manager. Operates projects, teams, tasks, developer assignment, AI Project Planning, baseline-v2 developer recommendations, workload engine, and risk assessments. Forbidden from research tools.
- **DEVELOPER**: Engineering Contributor. Operates inside personal **Developer Workspace**. Access limited to viewing assigned tasks, updating self profile/skills, viewing personal workload, performance metrics, streaks, achievements, and incentive rewards. Forbidden from management endpoints.

---

## 2. API Authorization Audit & Verification

| Endpoint | ADMIN | MANAGER | DEVELOPER | Verification Status |
| :--- | :---: | :---: | :---: | :--- |
| `POST /api/projects` | ✅ 201 | ✅ 201 | ❌ 403 | VERIFIED WORKING |
| `POST /api/teams` | ✅ 201 | ✅ 201 | ❌ 403 | VERIFIED WORKING |
| `POST /api/developers` | ✅ 201 | ✅ 201 | ❌ 403 | VERIFIED WORKING |
| `PUT /api/developers/{id}` | ✅ 200 | ✅ 200 | ✅ 200 (Self) | VERIFIED WORKING |
| `POST /api/tasks` | ✅ 201 | ✅ 201 | ❌ 403 | VERIFIED WORKING |
| `POST /api/assignments` | ✅ 201 | ✅ 201 | ❌ 403 | VERIFIED WORKING |
| `GET /api/recommendations/task/{id}`| ✅ 200 | ✅ 200 | ❌ 403 | VERIFIED WORKING |
| `POST /api/ai-planning/generate` | ✅ 200 | ✅ 200 | ❌ 403 | VERIFIED WORKING |
| `GET /api/recommendations/research/*` | ✅ 200 | ❌ 403 | ❌ 403 | VERIFIED WORKING |
| `GET /api/recommendations/audit` | ✅ 200 | ❌ 403 | ❌ 403 | VERIFIED WORKING |

---

## 3. Enforcement Architecture Truth
- **Backend Protection**: Enforced using `require_roles(*allowed_roles)` dependency factory in `backend/app/api/deps.py`. Unauthenticated or unauthorized requests return `401 Unauthorized` or `403 Forbidden` headers.
- **Frontend Protection**: Enforced using `getFilteredNavigation(role)` in `frontend/lib/navigation.ts` and `hasPermission(role, path)` in `frontend/lib/permissions.ts`.
