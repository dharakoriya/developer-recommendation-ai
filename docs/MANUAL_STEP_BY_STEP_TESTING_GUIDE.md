# DevAlign AI — Complete Step-by-Step Manual Testing & Viva Guide

This guide provides a practical, step-by-step walkthrough to test **every feature** of DevAlign AI on your laptop starting from a clean database state.

---

## 🚀 Quick Setup & Database Reset

### 1. Reset Database to Clean Seed State
Open your terminal in the project directory (`devalign-ai` or `devalign-ai\backend`) and run:

```bash
python reset_db.py
```
*Note: The script automatically detects the virtual environment (`venv\Scripts\python.exe`) and seeds default users, core skills, a sample project, team, tasks, and recommendations.*

### 2. Default Test Credentials
| Role | Email | Password | Allowed Access |
|---|---|---|---|
| **Admin** | `admin@devalign.ai` | `admin123` | All pages, User management, System configs |
| **Manager** | `manager@devalign.ai` | `manager123` | Project creation, Task creation, Recommendations, Assignments |
| **Developer** | `dev@devalign.ai` | `dev123` | Assigned Tasks, Personal Workload, Performance, Incentives |

### 3. Verify Applications Running
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive Swagger Docs)

---

## 📋 Step-by-Step Feature Testing Sequence

```
RESET DATABASE
      ↓
STEP 1: LOGIN & AUTHENTICATION
      ↓
STEP 2: MANAGE PROJECTS & TEAMS
      ↓
STEP 3: CREATE & WEIGHT TASKS
      ↓
STEP 4: WORKLOAD ENGINE CHECK
      ↓
STEP 5: GENERATE RECOMMENDATIONS (BASELINE-V2)
      ↓
STEP 6: ASSIGN DEVELOPER & VERIFY WORKLOAD
      ↓
STEP 7: COMPLETE TASK, PERFORMANCE & INCENTIVES
      ↓
STEP 8: AUTOMATED RISK ASSESSMENT
      ↓
STEP 9: AI PROJECT PLANNER (OLLAMA / HEURISTIC)
      ↓
STEP 10: RESEARCH & ML LAB (SHAP EXPLAINABILITY)
```

---

### Step 1: Authentication & Role-Based Access (RBAC)

1. Open [http://localhost:3000/login](http://localhost:3000/login).
2. Login as **Manager**: `manager@devalign.ai` / `manager123`.
   - **What happens**: JWT token is saved in `localStorage`, user redirected to `/dashboard`.
   - **Check**: Manager can see Projects, Teams, Tasks, Recommendations, and Assignments.
3. Sign Out by clicking the **Sign Out** button in the header.
   - **Check**: System clears session token and redirects to `/login`.
4. Login as **Developer**: `dev@devalign.ai` / `dev123`.
   - **Check**: Developer navigation restricts access to sensitive Manager/Admin tools like Developer Comparison analytics.

---

### Step 2: Create a Project & Engineering Team

1. Login as **Manager** (`manager@devalign.ai`).
2. Navigate to **Projects** (`/projects`).
3. Click **"+ Create New Project"**.
4. Fill in:
   - **Project Name**: `NextGen AI Health Platform`
   - **Description**: `AI-powered telemedicine dashboard with real-time vitals monitoring.`
   - **Status**: `ACTIVE`
5. Click **Save Project**.
   - **Verify**: Project appears in table and project health metrics update.
6. Navigate to **Teams** (`/teams`).
7. Click **"+ Create Team"**, select `NextGen AI Health Platform`, and name it `AI Core Team`. Add developers to the team.

---

### Step 3: Create Tasks & Calculate Task Weight Scores

1. Navigate to **Tasks** (`/tasks`).
2. Click **"+ Create Task"**.
3. Fill in:
   - **Target Project**: `NextGen AI Health Platform`
   - **Task Title**: `Build Real-Time Patient WebSocket Service`
   - **Description**: `High-concurrency WebSocket server for live telemetry streaming.`
   - **Complexity**: `HIGH`
   - **Priority**: `CRITICAL`
   - **Estimated Hours**: `24`
   - **Required Skills**: Select `FastAPI` (Level 80) and `Python` (Level 85).
4. Click **Create Task**.
5. Inspect the newly created task card:
   - **What happens behind the scenes**:
     $$\text{Task Weight} = (75 \times 0.35) + (100 \times 0.25) + (80 \times 0.25) + (82.5 \times 0.15) = \mathbf{83.62} \quad (\text{CRITICAL})$$
   - **Check**: Task card displays a `CRITICAL (83.6)` task weight badge.

---

### Step 4: Check Initial Workload Distribution

1. Navigate to **Workload Balancing Engine** (`/workload`).
2. Inspect the developer workload matrix:
   - **Alice Backend Lead**: `0.0h (0%)` — `HEALTHY` 💚
   - **Bob Fullstack Engineer**: `0.0h (0%)` — `HEALTHY` 💚
   - **Charlie Junior Frontend**: `0.0h (0%)` — `HEALTHY` 💚
3. **Verify**: All developers have sufficient capacity before assignment.

---

### Step 5: Generate Baseline-v2 Developer Recommendations

1. Navigate to **Recommendations** (`/recommendations`).
2. Select task: `Build Real-Time Patient WebSocket Service`.
3. Click **⚡ Find Best Developer**.
4. Inspect the recommendation ranking:
   - **Top Candidate**: **Alice Backend Lead** (Score: ~`92.5 / 100`) — `ELIGIBLE`
     - *Why*: High skill match in FastAPI/Python (30%), 0% workload, 5 years experience.
   - **Second Candidate**: **Bob Fullstack Engineer** (Score: ~`78.0 / 100`) — `ELIGIBLE`
   - **Excluded / Low Ranked**: **Charlie Junior Frontend** — `INELIGIBLE` or `CONDITIONALLY ELIGIBLE`
     - *Exclusion Reason*: Missing required backend skills (FastAPI/Python) & high weight task requirement.
5. **Viva Note**: Explain that Baseline-v2 is a 7-factor deterministic recommendation engine enforcing hard constraints ($>100\%$ capacity exclusion and zero-skill match exclusion) before ranking candidates.

---

### Step 6: Assign Developer & Verify Workload Recalculation

1. On the Recommendation card for **Alice Backend Lead**, click **Assign Task**.
2. Navigate to **Assignments** (`/assignments`).
   - **Check**: Assignment record is `ACTIVE` with `compatibility_score=92.5` and `task_weight_category=CRITICAL`.
3. Navigate to **Workload Balancing Engine** (`/workload`).
   - **Check**: Alice's workload has updated automatically to `24.0h (60%)` — `MODERATE` 💙.
4. **Test Overload Scenario**:
   - Assign 2 more heavy tasks to Alice so her total assigned hours exceed `40.0h` ($>100\%$).
   - Re-run recommendations for a new task: Alice will now be flagged as `INELIGIBLE` with reason: `❌ Workload Exceeds Capacity Limit (>100%)`.

---

### Step 7: Complete Task, Developer Performance & Incentives

1. Navigate to **Assignments** (`/assignments`) or **Tasks** (`/tasks`).
2. Locate the active task assigned to Alice and click **Complete Task**.
3. Enter outcome details:
   - **Completion Status**: `ON_TIME`
   - **Code Quality Rating**: `5.0 / 5.0`
4. Submit completion.
5. Navigate to **Performance Analytics** (`/analytics/performance`):
   - **Check**: Alice's composite performance score and completion streak increase.
6. Navigate to **Project Intelligence & Analytics** (`/analytics`):
   - **Check**: Incentive Ledger shows points awarded:
     $$\text{Points} = \text{Base Rate} \times \text{Task Weight} \times (1 + \text{On-Time Bonus})$$

---

### Step 8: Test Automated Risk Management

1. Navigate to **Project Health & Risk Analytics** (`/analytics`).
2. Inspect the Automated Risk Assessment panel:
   - **Workload Overload Risk**: Triggers if any developer has $>100\%$ assigned capacity.
   - **Approaching Deadline Risk**: Triggers for active tasks within 48 hours of target date.
   - **Skill Bottleneck Risk**: Triggers for tasks with specialized skills lacking available team coverage.

---

### Step 9: Test AI Project Planner

1. Navigate to **AI Project Planner** (`/ai-planning`).
2. Enter project details:
   - **Project Name**: `Smart Campus Mobile App`
   - **Description**: `Flutter cross-platform app for student course schedules, cafeteria payments, and library book reservation.`
   - **Project Type**: `MOBILE_APP`
   - **Granularity**: `BALANCED`
3. Click **Generate AI Project Plan**.
   - **What happens**: Service queries Ollama local LLM (`http://localhost:11434`), OpenAI API, or falls back seamlessly to the offline Heuristic Planner.
4. Review generated draft milestones, tasks, estimated hours, and required skills.
5. Click **Approve & Import Plan into Database**.
   - **Check**: Real `Project` and `Task` rows are instantiated in PostgreSQL.

---

### Step 10: Research & ML Lab & SHAP Explainability

1. Navigate to **Research & ML Lab** (`/research`).
2. Open **Dataset Explorer** (`/research/dataset`): Inspect synthetic training dataset distribution.
3. Open **Model Training** (`/research/models`): Inspect Random Forest vs XGBoost accuracy metrics.
4. Open **SHAP Explainability** (`/research/shap`): Inspect feature importance waterfall plots showing how individual developer attributes contribute to ML ranking predictions.
5. **Viva Explanation**: Clarify that ML models in `/research` are used for experimental explainability benchmarking, while production assignments use the deterministic Baseline-v2 engine for enterprise safety and zero-latency execution.

---

## 🎨 Theme Verification (Light vs Dark Mode)

1. Click the **Theme Toggle (☀️ / 🌙)** button in the top navigation header.
2. Verify all pages adapt cleanly without refreshing:
   - **Light Mode**: White card surfaces (`bg-white`), slate text (`text-slate-900`), light borders (`border-slate-200`), crisp table headers (`bg-slate-100`).
   - **Dark Mode**: Dark slate panels (`bg-slate-900`), pale text (`text-slate-100`), dark borders (`border-slate-800`).

---

## ✅ Summary Verification Checklist

- [x] Database reset via `python reset_db.py`
- [x] Authentication & RBAC login/logout
- [x] Project & Team creation
- [x] Task creation & automatic Task Weight calculation
- [x] Baseline-v2 recommendation generation & exclusion rules
- [x] Developer assignment & real-time workload balancing
- [x] Task completion, performance rating & incentive ledger points
- [x] Automated risk assessment triggers
- [x] AI Project Planner plan generation & database import
- [x] Research & ML Lab SHAP explainability plots
- [x] Light & Dark theme toggle contrast
