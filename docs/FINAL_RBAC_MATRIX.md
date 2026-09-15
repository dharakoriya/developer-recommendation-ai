# DevAlign AI — Role-Based Access Control (RBAC) Matrix

## 1. Role Definitions

1. **ADMIN**: Full operational & administrative control over users, projects, teams, tasks, intelligence settings, governance, and research benchmarks.
2. **MANAGER**: Project creator and lead. Authorized to create projects, configure teams, author tasks, run recommendations, assign developers, and review project intelligence.
3. **DEVELOPER**: Individual engineer. Authorized to view assigned tasks in "My Work", run the live execution timer, complete tasks, review personal points, badges, streaks, and personal work intelligence (`/analytics/me`).

---

## 2. Comprehensive Endpoint & Feature Permission Matrix

| Endpoint / Feature | ADMIN | MANAGER | DEVELOPER | Backend Enforcement | Frontend UI Handling |
|---|:---:|:---:|:---:|---|---|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | Public | Login Form |
| `GET /api/projects` | ✅ | ✅ | ✅ | Authenticated | Visible to all roles |
| `POST /api/projects` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | "Create Project" button hidden for Dev |
| `GET /api/teams` | ✅ | ✅ | ✅ | Authenticated | Visible to all roles |
| `POST /api/teams` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | "Create Team" hidden for Dev |
| `GET /api/developers` | ✅ | ✅ | ✅ | Authenticated | Directory visible to all |
| `GET /api/tasks` (All Org Tasks) | ✅ | ✅ | ⚠️ Filtered | Developers only receive their actively assigned tasks | Shows personal tasks in My Work |
| `POST /api/tasks` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | "New Task" button hidden for Dev |
| `POST /api/tasks/{id}/assign` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | "Assign Developer" button hidden for Dev |
| `GET /api/recommendations/tasks/{id}` | ✅ | ✅ | ❌ | HTTP 403 Forbidden for DEVELOPER | "Find Best Developer" hidden for Dev |
| `POST /api/tasks/{id}/timer/*` | ✅ | ✅ | ✅ (Own) | Validates caller is assigned developer | Interactive HH:MM:SS timer widget |
| `POST /api/tasks/{id}/complete` | ✅ | ✅ | ✅ (Own) | Validates caller is assigned developer | "Complete Task" button |
| `GET /api/workload/summary` | ✅ | ✅ | ✅ | Authenticated | Workload Dashboard |
| `GET /api/analytics/projects` | ✅ | ✅ | ❌ | HTTP 403 Forbidden for DEVELOPER | Blocked in router & hidden in Sidebar |
| `GET /api/analytics/teams` | ✅ | ✅ | ❌ | HTTP 403 Forbidden for DEVELOPER | Blocked in router & hidden in Sidebar |
| `GET /api/analytics/tasks` | ✅ | ✅ | ❌ | HTTP 403 Forbidden for DEVELOPER | Blocked in router & hidden in Sidebar |
| `GET /api/analytics/recommendations` | ✅ | ✅ | ❌ | HTTP 403 Forbidden for DEVELOPER | Blocked in router & hidden in Sidebar |
| `GET /api/analytics/developer/me` | ✅ | ✅ | ✅ | Authenticated (scoped to caller) | Dedicated "My Work Intelligence" page |
| `POST /api/ai-planning/generate` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | AI Planner menu item hidden for Dev |
| `POST /api/ai-planning/apply` | ✅ | ✅ | ❌ | `require_roles(ADMIN, MANAGER)` | Plan Apply button restricted |
| `GET /api/recommendations/research/*` | ✅ | ✅ | ✅ | Authenticated (Read-only benchmarking) | Research & ML Lab tabs |

---

## 3. Security Guarantee Against Direct API Bypass

If a user authenticated with the `DEVELOPER` role attempts to bypass the UI and execute a direct cURL / Postman request to:
- `GET /api/analytics/projects` → Receives **HTTP 403 Forbidden** (`Access forbidden. Developer role is restricted from viewing organization-wide analytics`).
- `GET /api/recommendations/tasks/{task_id}` → Receives **HTTP 403 Forbidden** (`Access forbidden. Developer role is restricted from viewing organization recommendation rankings`).
- `POST /api/tasks/{task_id}/assign` → Receives **HTTP 403 Forbidden** (`Insufficient role privileges`).
- `POST /api/tasks/{task_id}/complete` for a task assigned to Developer B → Receives **HTTP 403 Forbidden** (`You are not the assigned developer for this task`).
