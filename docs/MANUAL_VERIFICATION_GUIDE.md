# DevAlign AI — Manual Verification & Testing Guide

## 1. Overview & Verification Scope
This document provides step-by-step procedures for manually testing DevAlign AI across Role-Based Access Control (RBAC) boundaries (`ADMIN`, `MANAGER`, `DEVELOPER`), verified REST API routes, role-specific dashboards, transparent recommendation engine decision flows (`baseline-v1`), and controlled test scenarios.

---

## 2. Pre-Requisites & Local Setup

### Step 1: Ensure Local PostgreSQL Database is Running
- **Database Engine**: PostgreSQL 14+
- **Host**: `localhost:5432` (`devalign_db`)

### Step 2: Apply Migrations & Seed Controlled Demo Data
```bash
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe scripts/seed_demo_data.py
```

### Step 3: Start Backend API & Frontend Applications
- **Backend API**: `cd backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`
- **Frontend App**: `cd frontend && npm run dev`

---

## 3. Role-Based Access Control (RBAC) Verification

### Account Credentials Matrix

| User Role | Account Email | Password | Allowed Navigation & Actions |
|---|---|---|---|
| **ADMIN** | `admin@devalign.ai` | `admin123` | Dashboard, Projects, Teams, Developers, Tasks, Assignments, Recommendations, Workload Engine, Research & Governance Lab. Full organization & system access. |
| **MANAGER** | `manager@devalign.ai` | `manager123` | Dashboard, Projects, Teams, Developers, Tasks, Assignments, Recommendations, Workload. Full operational project & team lead management. |
| **DEVELOPER** | `alice@devalign.ai` | `dev123` | Dedicated Developer Workspace (`/dashboard`, `/tasks`, `/workload`). Blocked from project/task creation & administrative research pages. |

---

## 4. Controlled Recommendation Engine Test Scenarios (`baseline-v1`)

The controlled dataset allows verifying 5 distinct recommendation scenarios:

### Scenario A — Backend API Task (Python + FastAPI)
- **Task**: `Build Authentication API` (Requires FastAPI 80, Python 85, PostgreSQL 75)
- **Candidate State**: Alice Sharma has Python 90, FastAPI 85, PostgreSQL 80. Workload = 65.0% (`BALANCED`).
- **Expected Result**: Alice Sharma ranks **#1** or **#2** with high suitability score (~92.4%).

### Scenario B — Frontend UI Task (React + TypeScript)
- **Task**: `Implement Payment Dashboard` (Requires React 85, TypeScript 80)
- **Candidate State**: Rahul Patel has React 95, TypeScript 90. Workload = 46.0% (`AVAILABLE`).
- **Expected Result**: Rahul Patel ranks **#1** for frontend dashboard tasks.

### Scenario C — Workload Capacity Impact
- **Task**: `Build Course Management API` (Requires Python 85, FastAPI 80, PostgreSQL 75)
- **Candidate State**: Priya Mehta has zero active tasks (0.0% workload), whereas Alice Sharma has 65.0% workload.
- **Expected Result**: Priya Mehta receives a workload capacity bonus ranking above balanced candidates.

### Scenario D — Availability Penalty
- **Task**: `Containerize Backend Service` (Requires Docker 90)
- **Candidate State**: David Wilson has Docker 95 proficiency but is marked `UNAVAILABLE`.
- **Expected Result**: David Wilson receives an availability factor penalty (0.05 factor) lowering his candidate rank.

### Scenario E — Skill Proficiency Threshold Gap
- **Task**: `Design PostgreSQL Reporting Schema` (Requires PostgreSQL 80, Python 70)
- **Candidate State**: Alice Sharma (PostgreSQL 80) vs. Rahul Patel (Python 40, no PostgreSQL).
- **Expected Result**: Alice Sharma ranks significantly higher due to required skill coverage and proficiency match.

---

## 5. End-to-End Operational Workflow

1. **Sign In**: Login as `manager@devalign.ai` / `manager123`.
2. **Dashboard**: Verify manager metrics (Active Projects, Team Developers, Active Tasks, Unassigned Tasks).
3. **Create Project**: Navigate to `/projects`, click **+ New Project**, enter `Payment Gateway Gateway V2`, select `ACTIVE`.
4. **Create Task**: Navigate to `/tasks`, click **+ Create Task**, enter `Build OAuth2 Token Revocation Service`, select `HIGH` priority and `HIGH` complexity.
5. **Run Recommendation**: Click **⚡ Find Best Developer** on the newly created task. Select task from dropdown and click **Find Best Developer**.
6. **Assign Candidate**: Review candidate suitability scores and click **Assign Developer**.
7. **Verify Workload Update**: Navigate to `/workload` and verify assigned developer's workload percentage has increased accordingly.
