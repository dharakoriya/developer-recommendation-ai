# Milestone 31 — Role-Specific Workspaces, Task Execution Timer, Team Management & Complete Task Detail

## Overview

This milestone implements four major objectives that complete the Developer, Manager, and Admin role-specific experience in DevAlign AI:

1. **Analytics RBAC Enforcement** — Developer role can no longer see org-wide project/team/task/recommendation analytics.
2. **HH:MM:SS Live Timer** — Full second-precision timer that survives page refresh, navigation, and logout/login.
3. **Team System Enhancement** — Teams page shows project name, task counts, expandable member list with add/remove.
4. **Complete Task Detail Page** — Fully rebuilt with role-specific layouts, state matrix enforcement, and integrated live timer.

---

## Role & Relationship Hierarchy

```
Organisation (implicit — all users belong to one org)
│
├── ADMIN (1 or more)
│   ├── Can access ALL data (no filtering)
│   ├── Manages: Projects, Teams, Tasks, Developers, Recommendations, Workload
│   ├── Sees: Research & ML Lab, Audit & Governance Log
│   └── Analytics: Full org-wide — Project Health, Team Capacity, Task Intelligence, Recommendation Funnel
│
├── MANAGER (1 or more)
│   ├── Can access project-scoped data
│   ├── Manages: Projects (they create), Teams under those projects, Tasks, Assignments
│   ├── Does NOT see: Research lab, ML evaluation
│   └── Analytics: Org-wide project health, team capacity, task intelligence (no developer comparison)
│
└── DEVELOPER (many)
    ├── Can ONLY see their own assigned tasks
    ├── Cannot access: Projects, Teams, Developers, Assignments, Recommendations pages
    ├── Sees: Dashboard (personal), Tasks (all tasks for context), Workload Engine (personal), My Work Intelligence
    └── Analytics: MY WORK only (/analytics/me) — personal task counts, performance, workload, streak, incentives

Team Architecture:
  Project → has many Teams
  Team    → has many TeamMembers (soft-delete with left_at)
  TeamMember → links DeveloperProfile ↔ Team
  Task    → optionally assigned to a Team (team_id nullable)

No manager-owned teams: teams are project-scoped, managed by ADMIN/MANAGER role.
```

---

## Feature 1 — Analytics RBAC (Backend Enforcement)

### What Changed

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /analytics/projects` | Open to all | **403 DEVELOPER** |
| `GET /analytics/teams` | Open to all | **403 DEVELOPER** |
| `GET /analytics/tasks` | Open to all | **403 DEVELOPER** |
| `GET /analytics/recommendations` | Open to all | **403 DEVELOPER** |
| `GET /analytics/developers` | 403 DEVELOPER | 403 DEVELOPER (unchanged) |
| `GET /analytics/developer/me` | **NEW** | Personal analytics for authenticated user only |

### New Endpoint: `/api/analytics/developer/me`

Returns personal-only data for the logged-in developer:
- Active task list (with `total_actual_seconds`, `is_timer_running`, `deadline`)
- Recent completed tasks
- `performance_score`, `completion_rate`, `on_time_rate`
- `current_workload_score`, `availability_status`
- `current_streak`, `longest_streak`, `incentive_points`
- `top_skills` (top 5 by proficiency)

**Security guarantee**: The endpoint uses `current_user.id` → `DeveloperProfile.user_id` to scope all queries. It is impossible to obtain another developer's data through parameter tampering.

### Frontend: `/analytics/me` (New Page)

- Accessible to all roles via sidebar for developers only
- KPI cards: Performance Score, Completion Rate, Workload Score, Incentive Points
- Streak panel (current + longest)
- Top Skills chips
- Time summary: actual vs estimated vs on-time rate
- Active tasks grid (click → task detail with live timer)
- Recently completed tasks

---

## Feature 2 — HH:MM:SS Live Timer

### Database Change

Added column `total_actual_seconds INTEGER DEFAULT 0` to the `tasks` table.

- Previously: accumulated `total_actual_minutes` (precision loss: `max(1, int(elapsed_seconds // 60))`)
- Now: accumulates `total_actual_seconds` with exact integer precision on every pause/stop
- `total_actual_minutes` is kept in sync (`= total_actual_seconds // 60`) for analytics backwards-compatibility

### How the Timer Works

**Start (`POST /tasks/{id}/start`):**
- Sets `task.status = IN_PROGRESS`
- Sets `task.is_timer_running = True`
- Sets `task.timer_started_at = datetime.now(utc)` (current session start)
- Sets `task.started_at` only on first start (preserved across pauses)

**Pause (`POST /tasks/{id}/pause`):**
- Computes `elapsed_secs = int((now - timer_started_at).total_seconds())`
- Adds to `total_actual_seconds`
- Clears `is_timer_running` and `timer_started_at`

**Stop/Complete (`POST /tasks/{id}/stop`):**
- Same second accumulation as pause
- Sets `status = COMPLETED`, `completed_at`, `completed_by`
- Marks active assignment as `COMPLETED`
- Triggers: streak update, incentive calculation, achievement evaluation, performance snapshot

**Timer Persistence (survives refresh/logout):**
- On page load, frontend receives `total_actual_seconds` + `timer_started_at`
- If `is_timer_running = true`, frontend computes:
  ```
  liveSecs = total_actual_seconds + floor((Date.now() - timer_started_at) / 1000)
  ```
- This `setInterval(1000)` loop makes the display tick every second
- On re-login, `total_actual_seconds` is whatever was accumulated + any current session elapsed

### Display Format

`HH:MM:SS` — e.g. `01:24:37` for 1 hour, 24 minutes, 37 seconds.

### Visual Indicators

- **Green pulsing dot** + `RECORDING` label when timer is running
- **Progress bar**: actual seconds vs estimated seconds, color coded:
  - Green (< 75% of estimate)
  - Amber (75–100% of estimate)
  - Red (over budget)
- Variance display: actual hours - estimated hours

---

## Feature 3 — Task Detail Page (Complete Rebuild)

### Role-Specific Sections

**Developer View (`/tasks/[id]`):**
1. Breadcrumb + `🎯 MY TASK` badge (if assigned)
2. Title, status, priority, complexity, weight score badges
3. **Big Timer Panel** (`HH:MM:SS`, progress bar, variance)
4. Action buttons: Start Work / Resume Timer / Pause / Mark Complete
5. Task Details sidebar: project, team, category, est. hours, deadline, assigned to
6. Task Description (below)
7. Required Skills grid

**Manager/Admin View (`/tasks/[id]`):**
1. Breadcrumb + full title + status badges
2. Action buttons: Find Best Developer / Reassign / Reopen (state-gated)
3. **Task Overview**: description, project, team, category, priority, complexity, dates
4. **Execution State & Timer**: `HH:MM:SS` + started_at, completed_at, completed_by, timer running?
5. **Current Assignment**: developer name, assigned at, compatibility score, workload
6. **Assignment History**: all assignment records with status
7. Sidebar: Weight Score (with color-coded gauge), Required Skills, AI Recommendation shortcut

### State Matrix

| Status | isAssignedDev | isManager/Admin |
|--------|---------------|-----------------|
| TODO | Start Work button | Find Best Developer button |
| IN_PROGRESS (timer off) | Resume Timer + Pause (hidden) + Complete | Reassign button |
| IN_PROGRESS (timer on) | Pause + Complete | View timer (read-only) |
| COMPLETED | View summary | View summary |
| CANCELLED | — | Reopen button |

---

## Feature 4 — Enhanced Team Management

### Teams Page (`/teams`)

**Team Cards now show:**
- Project name (color-coded badge)
- Member count
- **Active Tasks count** (blue) and **Completed Tasks count** (green)
- "Show/Hide Members" expandable section
- "+ Add Dev" inline button per card

**Expanded Member view:**
- Developer name, email (truncated), availability status (color-coded), experience years
- Remove button (✕) per member — triggers `DELETE /api/teams/{team_id}/members/{developer_id}`

**Add Member modal:**
- Lists all available developers
- Shows availability status in dropdown

### Backend Changes

`build_team_response()` in `projects.py` now computes:
- `project_name` from `team.project.name` (via joinedload)
- `active_tasks_count` — tasks not in COMPLETED/CANCELLED
- `completed_tasks_count` — tasks in COMPLETED

`list_all_teams()` in `teams.py` now joinloads `Team.project` and `Team.tasks` in addition to members.

---

## Viva Questions & Answers

### Q: How does the timer persist through page refresh?

The timer state is stored in the PostgreSQL database (`total_actual_seconds`, `is_timer_running`, `timer_started_at`). When the page reloads, the frontend fetches the task and reconstructs the elapsed time:
```
liveSecs = total_actual_seconds + secondsElapsed(timer_started_at)
```
No client-side state is needed.

### Q: What prevents a developer from seeing another developer's data?

At the backend (`/analytics/developer/me`), the SQL query is scoped by `DeveloperProfile.user_id == current_user.id`. Even if the user modified the request, `current_user` is derived from the signed JWT — not a URL parameter.

### Q: Why is `total_actual_seconds` separate from `total_actual_minutes`?

`total_actual_minutes` was rounded up using `max(1, int(...//60))`, losing sub-minute precision. Analytics (workload score, performance score) use minutes — we kept this column. The new `total_actual_seconds` gives exact precision for the timer display without breaking existing analytics.

### Q: How does task assignment and the timer relate?

Assignment status is `ACTIVE` when a developer is working on a task. The timer only starts when an ACTIVE assignment exists. On `stop`, the assignment status is set to `COMPLETED` simultaneously with the task status. Performance, streak, and incentive updates happen in the same transaction.

### Q: What is the Team's relationship to a Manager?

There is **no explicit manager_id on Team**. Teams belong to Projects. Project creation is restricted to `ADMIN` and `MANAGER` roles. Any admin or manager can manage any team. For per-manager project isolation, you would add `manager_id` to `Project` (not yet implemented by design).

---

## Files Changed

### Backend
| File | Change |
|------|--------|
| `app/models/task.py` | Added `total_actual_seconds: int` column |
| `app/schemas/task.py` | Added `total_actual_seconds: int = 0` to TaskResponse |
| `app/api/tasks.py` | Accumulate seconds (not minutes) in pause/stop; serialize `total_actual_seconds` |
| `app/api/analytics.py` | All 4 org endpoints return 403 for DEVELOPER; new `/developer/me` endpoint |
| `app/services/analytics_service.py` | Added `get_developer_personal_analytics()` + `Skill` import |
| `app/schemas/analytics.py` | Added `PersonalTaskSummary`, `DeveloperPersonalAnalytics` schemas |
| `app/schemas/project.py` | Added `project_name`, `active_tasks_count`, `completed_tasks_count` to `TeamResponse` |
| `app/api/projects.py` | `build_team_response()` computes project name + task counts |
| `app/api/teams.py` | `list_all_teams` now joinloads `Team.project` and `Team.tasks` |

### Frontend
| File | Change |
|------|--------|
| `lib/navigation.ts` | Added `My Work Intelligence` nav for DEVELOPER; fixed ADMIN filter |
| `lib/permissions.ts` | Added `/analytics` (ADMIN/MANAGER) and `/analytics/me` (all) permissions |
| `app/analytics/me/page.tsx` | **NEW** — Developer personal analytics page |
| `app/tasks/[id]/page.tsx` | **REBUILT** — Full role-specific task detail with live HH:MM:SS timer |
| `app/teams/page.tsx` | **REBUILT** — Enhanced team cards with members + task counts |
