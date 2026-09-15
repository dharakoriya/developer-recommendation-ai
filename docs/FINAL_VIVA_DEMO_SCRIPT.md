# DEVAlign AI — Final Viva & Demonstration Script
**Step-by-Step Practical Presentation Guide**

This guide provides a comprehensive "Golden Path" viva presentation script. Follow these steps in order to demonstrate every key feature of DevAlign AI.

---

## Pre-Demo Setup Checklist (2 Minutes Before Presentation)

1. **Verify Database is Seeded**:
   ```powershell
   cd "D:\Custom Project\dhara\devalign-ai\backend"
   .\venv\Scripts\python scripts/seed_demo_data.py
   ```
2. **Ensure Servers are Running**:
   - Backend: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
   - Frontend: `http://localhost:3000`

---

## 🎯 ACT 1 — SYSTEM ADMINISTRATION & PLATFORM OVERVIEW (Role: Admin)

### Step 1: Login as System Admin
- **URL**: `http://localhost:3000/login`
- **Email**: `admin@devalign.ai`
- **Password**: `admin123`
- **Click**: "Sign In"
- **Expected Result**: Admin Dashboard loads showing platform-wide KPIs: 6 Users, 3 Active Projects, 10 Total Tasks, and Developer Workload Summary.

### Step 2: Review Skills Matrix & Developer Profiles
- **Click**: Sidebar -> **Skills** (`/skills`)
- **Show**: 7 Core Skills across Backend, Frontend, Database, and DevOps categories.
- **Click**: Sidebar -> **Developers** (`/developers`)
- **Show**: 4 Developers with varying experience years, availability states, and skill proficiencies (e.g., Alice has 90% Python; Rahul has 95% React; David is marked UNAVAILABLE).

### Step 3: Demonstrate System Architecture & Health
- **Click**: Sidebar -> **Analytics** (`/analytics`)
- **Show**: Executive charts showing project velocity, team capacity utilization, and system delivery metrics.

---

## 🎯 ACT 2 — PROJECT MANAGEMENT, TASK WEIGHT & AI RECOMMENDATION (Role: Manager)

### Step 4: Login as Project Manager
- **Click**: User Avatar (top right) -> **Logout**
- **Login with**: `manager@devalign.ai` / `manager123`
- **Expected Result**: Manager Dashboard loads. Notice the manager has access to Projects, Teams, Tasks, Recommendations, Assignments, and AI Planner.

### Step 5: Explore Projects & Teams Hierarchy
- **Click**: Sidebar -> **Projects** (`/projects`)
- **Show**: 3 Projects:
  1. *FinTech Payment Platform*
  2. *University Learning Portal*
  3. *Internal Analytics Dashboard*
- **Click**: Sidebar -> **Teams** (`/teams`)
- **Show**: 3 Cross-functional teams mapped to projects and developers.

### Step 6: Inspect Task Weight Calculation (CRITICAL vs LIGHT)
- **Click**: Sidebar -> **Tasks** (`/tasks`)
- **Show**:
  1. **Task 6**: *"Core Transaction Idempotency & Settlement Engine"* -> Task Weight Score **81.08** (**CRITICAL** category badge). Explain the 4-factor formula: Complexity (40%), Priority (25%), Effort (20%), Skill Difficulty (15%).
  2. **Task 7**: *"Update Portal Privacy Policy & FAQ Copy"* -> Task Weight Score **24.90** (**LIGHT** category badge).

### Step 7: Demonstrate Intelligent Recommendation Engine (Case 1)
- **In Tasks List**: Click on Task 1: *"Build Payment Webhook Ingestion API"* (`/tasks/[id]`).
- **Show**: Status is `TODO`, no assigned developer.
- **Click**: **"Find Best Developer"** / **"View Recommendations"** (`/recommendations?task_id=[id]`).
- **Viva Explanation**:
  - **Alice Sharma** ranks **#1 (Score: ~88%)**: Perfect match on Python (90%) and FastAPI (88%), available, low current workload.
  - **Priya Mehta** ranks lower: Although skilled, her score is penalized by the Workload Anti-Monopoly factor because she already has 42h of active work.
  - **David Wilson** is listed under **Excluded Candidates**: Status *INELIGIBLE* ("❌ Developer Currently Unavailable").
  - **Rahul Patel** is penalized: Missing required backend skills (only 40% Python).
- **Click**: **"Assign to Alice Sharma"** -> Confirm Assignment.
- **Expected Result**: Task status transitions to `ASSIGNED` / `IN_PROGRESS`.

---

## 🎯 ACT 3 — DEVELOPER WORKSPACE, LIVE TIMER & EXECUTION (Role: Developer Alice)

### Step 8: Login as Developer Alice
- **Logout** and login with: `alice@devalign.ai` / `dev123`
- **Expected Result**: Developer Workspace loads. Notice management tabs (Projects, Teams, System Settings) are hidden per strict RBAC.

### Step 9: Live Task Execution & Minute/Second Timer (Case 3)
- **Click**: Sidebar -> **My Tasks** (`/tasks` or Developer Dashboard)
- **Open Task 3**: *"Build Authentication & RBAC Engine"*
- **Show**:
  - Task Status: `IN_PROGRESS`
  - **Execution Timer**: Actively ticking live in `HH:MM:SS` format.
- **Click**: **"Pause Timer"** -> Notice the timer stops, logging total elapsed seconds.
- **Click**: **"Resume Timer"** -> Timer starts ticking again immediately.

### Step 10: Complete Task & Verify Incentive Ledger (Case 5 & 11)
- **Click**: **"Complete Task"** -> Confirm completion.
- **Expected Result**:
  - Task status transitions to `COMPLETED`.
  - `completed_by` records Alice Sharma's ID.
  - `completed_at` records the exact timestamp.
- **Click**: Sidebar -> **My Performance** / **Incentives** (`/incentives` or Developer Profile)
- **Show**: Alice's 5-day active streak and 850 incentive points breakdown:
  - Base Reward: 600 pts
  - Difficulty Bonus: 120 pts
  - On-Time Bonus: 90 pts
  - Streak Multiplier: 40 pts
  - Badges Earned: "Fast Starter", "Consistent Performer".

---

## 🎯 ACT 4 — DEVELOPER WORKLOAD & CAPACITY PRESSURE (Role: Developer Priya)

### Step 11: Login as Developer Priya
- **Logout** and login with: `priya@devalign.ai` / `dev123`
- **Click**: Sidebar -> **My Workload** (`/workload`)
- **Show**:
  - Priya is assigned two active tasks: *"Refactor Database Connection Pool"* (24h) + *"Emergency Security Patch"* (18h) = 42h active effort.
  - Capacity Status: **OVERLOADED (105%)** with warning indicator.
  - Explain how this prevents task burnout and feeds back into the anti-monopoly recommendation engine.

---

## 🎯 ACT 5 — PROJECT RISK ASSESSMENT ENGINE (Role: Manager)

### Step 12: Login as Manager to View Project Risk
- **Logout** and login with: `manager@devalign.ai` / `manager123`
- **Click**: Sidebar -> **Risk Management** (`/risk`)
- **Show**:
  - **Emergency Security Patch for JWT Signatures** triggers **CRITICAL Risk Level (88/100)**.
  - Breakdown shows:
    1. **Schedule Risk (90%)**: Deadline is within 12 hours.
    2. **Workload Risk (85%)**: Assigned developer (Priya) is currently overloaded (> 100%).
    3. **Recommended Action**: Reassign or adjust sprint scope.

---

## 🎯 ACT 6 — AI PROJECT PLANNER DEMO (Heuristic & Local LLM)

### Step 13: Generate Project Plan with AI Planner
- **Click**: Sidebar -> **AI Planner** (`/planner`)
- **Fill in Form**:
  - **Project Name**: `Mobile Banking Micro-App`
  - **Description**: `Cross-platform mobile banking app with biometric authentication, instant payments, and transaction history export.`
  - **Target Timeline**: `4 Weeks`
  - **Provider**: `heuristic` (or `ollama` if running)
- **Click**: **"Generate Project Plan"**
- **Show**:
  - AI decomposes the project into structured work packages.
  - Auto-assigns priority, complexity, estimated hours, and required skills (e.g. React Native, TypeScript, Security).
- **Click**: **"Approve & Create Project"** -> Creates real database Project, Tasks, and Skill mappings with one click!

---

## 🎯 ACT 7 — CENTRALIZED RECOMMENDATION MODEL SWITCH (baseline-v1 vs baseline-v2)

### Step 14: Demonstrate Model Switch in `.env`
1. Open `backend/.env` in VS Code / IDE.
2. Show current line: `RECOMMENDATION_MODEL=baseline-v2`.
3. Open `http://localhost:8000/api/recommendations/metadata/model`:
   - Returns: `"model_version": "baseline-v2"`.
4. Change line in `backend/.env` to: `RECOMMENDATION_MODEL=baseline-v1`.
5. Restart backend (or let uvicorn reload):
   - Open `http://localhost:8000/api/recommendations/metadata/model`.
   - Returns: `"model_version": "baseline-v1"`.
   - Any stale recommendations in UI are automatically refreshed.
6. Revert line to `RECOMMENDATION_MODEL=baseline-v2`.

---

## 🎯 ACT 8 — RESEARCH / ML LAB DEMONSTRATION (Optional ML Explainer)

### Step 15: Benchmark Candidate ML Explainer
- **Navigate to**: `http://localhost:3000/research` (or `research/` artifacts)
- **Show**:
  - Global Feature Importance chart derived from 20-feature synthetic dataset.
  - Local SHAP waterfall attributions for candidate Random Forest & XGBoost models.
  - Emphasize strict architectural boundary: Research models are isolated from deterministic production pipelines.

---

## Summary of Key Questions & Answers for Viva

1. **Q: Why does DevAlign AI use a deterministic baseline for production instead of pure black-box ML?**
   - *A: Deterministic algorithms guarantee mathematical repeatability, zero hallucination, instantaneous explanation auditing, and complete explainability (SHAP-aligned additivity) essential for high-stakes HR and workload management.*
2. **Q: How does the system prevent developer burnout?**
   - *A: Through the Workload Anti-Monopoly scoring factor in Baseline-v2, which applies a steep scoring penalty and exclusion checks when a developer's active tasks exceed capacity.*
3. **Q: What happens if an assigned developer is marked Unavailable?**
   - *A: The engine immediately triggers a hard exclusion rule (`INELIGIBLE`), surfacing clear reasons ("❌ Developer Currently Unavailable") to the manager.*
