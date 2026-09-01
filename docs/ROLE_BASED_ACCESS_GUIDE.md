# DevAlign AI — Role-Based Access Control (RBAC) & Runtime Guide

## 1. Executive Summary
DevAlign AI enforces multi-layered Role-Based Access Control (RBAC) across authentication state propagation, client-side route guards, dynamic sidebar navigation, and backend API authorization. The application delivers distinct, role-isolated user experiences for **System Administrators (ADMIN)**, **Project Managers (MANAGER)**, and **Software Engineers (DEVELOPER)**.

---

## 2. Role Permission & Capability Matrix

| Application Feature / Page | ADMIN | MANAGER | DEVELOPER |
|---|---|---|---|
| **Workspace Dashboard** (`/dashboard`) | Executive Admin Dashboard | Managed Team Dashboard | Personal Developer Workspace |
| **Projects** (`/projects`) | Full Read / Write | Scoped Read / Write | 🚫 403 Forbidden |
| **Teams** (`/teams`) | Full Read / Write | Scoped Read / Write | 🚫 403 Forbidden |
| **Developers Directory** (`/developers`) | Full Read / Write | View Team Profiles | 🚫 403 Forbidden |
| **Tasks Catalog** (`/tasks`) | Full Read / Write | Scoped Read / Write | 👁️ Read Assigned Tasks Only |
| **Assignments** (`/assignments`) | Full Read / Write | Scoped Read / Write | 🚫 403 Forbidden |
| **Recommendations Engine** (`/recommendations`) | Full Engine Access | Scoped Task Recommendations | 🚫 403 Forbidden |
| **Workload Engine** (`/workload`) | System Workload View | Team Workload View | Personal Capacity View |
| **Research ML & Dataset** (`/research/*`) | Full Access | 🚫 403 Forbidden | 🚫 403 Forbidden |
| **Audit & Governance** (`/recommendations/audit`) | Full Access | 🚫 403 Forbidden | 🚫 403 Forbidden |

---

## 3. Dedicated Role Experiences

### 👑 System Administrator (ADMIN)
- **Email**: `admin@devalign.ai` | **Password**: `admin123`
- **Dashboard**: System-wide project count, developer availability, active tasks, high-workload alerts, audit trail activity, and research ML benchmarks.
- **Capabilities**: Unrestricted access to all organization records, user management, and research ML labs.

### 👨💼 Project Manager (MANAGER)
- **Email**: `manager@devalign.ai` | **Password**: `manager123`
- **Dashboard**: Scoped managed projects, team capacity overview, unassigned task alerts, and recent candidate allocations.
- **Capabilities**: Full operational authority over assigned projects, teams, tasks, recommendations, and assignments. Research pages (`/research/*`) are restricted.

### 👨💻 Software Engineer (DEVELOPER)
- **Email**: `alice@devalign.ai` | **Password**: `dev123`
- **Dashboard**: Personal Developer Workspace featuring welcome banner, assigned task queue, personal workload capacity %, availability status, and skill proficiencies.
- **Capabilities**: Access strictly limited to personal workspace (`/dashboard`, `/tasks`, `/workload`). Accessing management or research pages triggers client-side and backend `HTTP 403 Forbidden` barriers.

---

## 4. Task Creation & Recommendation Scoring Pipeline

When a Manager or Admin creates a task and runs the Recommendation Engine, candidate scores are calculated in 5 steps:

```
Step 1: Task Inputs (Skills, Required Levels, Priority, Complexity, Hours)
   ↓
Step 2: Candidate Eligibility (Filter active developer profiles)
   ↓
Step 3: Feature Extraction (Skill Match %, Skill Coverage %, Workload %, Availability, Experience, Performance)
   ↓
Step 4: Deterministic Baseline-v1 Scoring (35% Skill + 15% Coverage + 20% Workload + 15% Perf + 10% Exp + 5% Avail)
   ↓
Step 5: Ranked Candidate Recommendations & Itemized Explanations
```

---

## 5. Runtime Verification Matrix

Run the following test accounts to verify role isolation:

1. **Admin Verification**:
   - Sign in as `admin@devalign.ai`.
   - Verify sidebar contains **Production Application** and **Research & ML Lab** sections.
   - Access `/dashboard`, `/projects`, `/tasks`, `/recommendations`, `/research/ml`, and `/recommendations/audit`.

2. **Manager Verification**:
   - Sign in as `manager@devalign.ai`.
   - Verify sidebar contains **Production Application** items only (Research section is hidden).
   - Attempt direct URL access to `/research/ml` ➔ Client-side & Backend **HTTP 403 Forbidden** Access Denied page renders.

3. **Developer Verification**:
   - Sign in as `alice@devalign.ai`.
   - Verify sidebar contains only **Developer Workspace** items (`Dashboard`, `Tasks`, `Workload Engine`).
   - Attempt direct URL access to `/projects` or `/recommendations` ➔ Client-side & Backend **HTTP 403 Forbidden** Access Denied page renders.
