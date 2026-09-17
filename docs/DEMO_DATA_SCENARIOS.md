# DEVAlign AI — Complete Demonstration Data & Scenarios Guide

## 1. Controlled Demonstration Environment Overview
The DEVAlign AI demonstration dataset provides a complete, deterministic, and reproducible system state designed to showcase all core intelligence capabilities across Workload Analytics, Explainable AI (XAI) Recommendations, Performance & Incentives, Real-Time Timer Execution, and Admin RBAC Governance.

### Default Demonstration Credentials (Local Development)
> **Note**: For local development and demonstration only. Accounts are initialized with secure bcrypt password hashing.

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | System Admin | `admin@devalign.ai` | `admin123` | User Provisioning, Access Governance, ML Evaluation Lab, Audit Logs |
| **MANAGER** | Project Manager | `manager@devalign.ai` | `manager123` | AI Planning, Projects & Teams, Task Assignment, Recommendation Engine |
| **DEVELOPER** | Alice Sharma | `alice@devalign.ai` | `dev123` | Backend Specialist (Python, FastAPI, Postgres), Live Task Timer, Streaks |
| **DEVELOPER** | Rahul Patel | `rahul@devalign.ai` | `dev123` | Frontend Specialist (React, TypeScript, UI/UX), Work Intelligence |
| **DEVELOPER** | Priya Mehta | `priya@devalign.ai` | `dev123` | Fullstack Engineer (Demonstrates High Workload & Capacity Pressure) |
| **DEVELOPER** | David Wilson | `david@devalign.ai` | `dev123` | DevOps Specialist (Docker, Postgres) — Unavailable Status Demonstration |

---

## 2. Master Demonstration Scenarios

### Scenario 1: Admin User Provisioning & Deactivation Workflow
- **Goal**: Demonstrate enterprise security governance where open public registration is completely disabled.
- **Actions**:
  1. Log in as `admin@devalign.ai`.
  2. Navigate to `/admin/users` (Admin User Management).
  3. Click **"Provision New User"**, select role `DEVELOPER`, and set experience to `3 years`.
  4. Submit form and verify user is provisioned with a linked `DeveloperProfile`.
  5. Toggle active status to `Deactivated` on a test user.
  6. Attempt login with the deactivated account to demonstrate immediate `401 Unauthorized` block.

---

### Scenario 2: Unassigned Task & 3-Tier Match Recommendation Engine
- **Goal**: Demonstrate explainable recommendations with skill match, experience, workload impact, and XAI breakdown.
- **Task**: *"Build Course Enrollment React Dashboard Component"* (TODO)
- **Engine Output**:
  - **Top Match**: `Rahul Patel` (95% Skill Match, React 95, TS 92, Available Capacity).
  - **Explainability**: SHAP/heuristic factor breakdown (Skill Match +42%, Workload +28%, Performance +18%, Experience +12%).
  - **Eligibility Tiers**:
    - **Eligible**: Developers meeting all required skill thresholds and availability.
    - **Conditionally Eligible**: Developers with partial skill coverage or moderate capacity.
    - **Ineligible**: Developers marked `UNAVAILABLE` (David Wilson) or severe skill gaps.

---

### Scenario 3: Real-Time Timer & Active Task Execution
- **Goal**: Demonstrate precise developer time tracking with persistence across navigation and page reloads.
- **Actions**:
  1. Log in as `alice@devalign.ai`.
  2. Navigate to `/tasks` or `/analytics/me`.
  3. Locate assigned in-progress task: *"Implement RESTful Auth & JWT Middleware"*.
  4. Click **"Start Timer"** — observe active pulsing indicator and ticking `HH:MM:SS` timer.
  5. Pause timer — observe accumulated tracked duration persisted to backend.
  6. Complete task — timer automatically finalizes, updating `actual_hours`, status to `COMPLETED`, and triggering incentive points calculation.

---

### Scenario 4: Workload Engine & Capacity Pressure
- **Goal**: Demonstrate workload distribution, weighted hours, and burnout prevention alerts.
- **Developers**:
  - `Alice Sharma`: 1 Active Task, 8.0h (~20% Capacity) -> **AVAILABLE / LOW PRESSURE**.
  - `Priya Mehta`: 3 Active High-Complexity Tasks (~95% Capacity) -> **HIGH / CAPACITY WARNING**.
- **Visuals**: Color-coded utilization gauges, capacity bar charts, and team workload distributions.

---

### Scenario 5: Multi-Factor Incentive & Achievement Engine
- **Goal**: Demonstrate automated gamified performance incentives based on delivery excellence.
- **Incentive Breakdown**:
  - **Base Reward**: Points proportional to task weight score.
  - **On-Time Bonus**: +20% bonus for completing before estimated hours.
  - **Difficulty Multiplier**: Tiered bonus for HIGH and CRITICAL tasks.
  - **Streak Bonus**: Extra multiplier for maintaining active completion streaks.
- **Achievements**: Unlockable badges (*"Speed Demon"*, *"Reliable Closer"*, *"Critical Fixer"*).

---

### Scenario 6: AI Project Planner with Ollama Local LLM Integration
- **Goal**: Demonstrate AI-powered project decomposition into structured tasks, required skills, priorities, and effort estimates.
- **Actions**:
  1. Log in as `manager@devalign.ai`.
  2. Navigate to `/ai-planning`.
  3. Enter a project prompt (e.g., *"Build an AI-powered code review and vulnerability scanning SaaS"*).
  4. Click **"Generate Project Plan"**.
  5. The planner decomposes the prompt into 6-10 structured tasks with auto-calculated weight scores and recommended assignments.
  6. Click **"Export to Project"** to commit the generated plan directly into the live database.

---

### Scenario 7: Research & ML Evaluation Lab (Admin Governance)
- **Goal**: Demonstrate machine learning model observability, dataset curation, and model switching.
- **Capabilities**:
  - Model evaluation comparing `baseline-v1` (heuristic) vs. `baseline-v2` (weighted ranking) vs. `ml-ranking-v1` (LightGBM/XGBoost).
  - Feature importance inspection via SHAP global bar charts.
  - Dataset snapshotting and human-in-the-loop validation labels.
  - Model hot-switching with instant recommendation cache invalidation.

---

## 3. Database Seeding & Reset Commands

To reset and seed the complete demonstration dataset:
```powershell
# From backend directory
venv\Scripts\python.exe scripts/seed_demo_data.py
```
Or use the standalone reset tool:
```powershell
venv\Scripts\python.exe reset_db.py
```
