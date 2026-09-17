# DEVAlign AI — Complete System Run & Demonstration Master Guide

## 1. Executive Summary & Technology Stack
**DEVAlign AI** is an enterprise-grade Workload & Explainable AI (XAI) Platform built for software engineering management. It intelligently aligns developers to tasks based on multi-dimensional skill vectors, experience, real-time workload capacity, performance history, and delivery risk.

### Technology Stack
- **Backend**: FastAPI (Python 3.12+), SQLAlchemy 2.0 ORM, PostgreSQL (`devalign_db`), Alembic Migrations, Pydantic v2.
- **Frontend**: Next.js 14+ (App Router), React 18, TailwindCSS, Lucide Icons, Modern Dark/Light Design System.
- **Machine Learning & Analytics**: Scikit-Learn, LightGBM, XGBoost, SHAP Explainability Engine, Pandas, NumPy.
- **Local AI & Planning**: Ollama Local LLM Integration (`mistral`, `llama3`, `deepseek-r1`).
- **Security & RBAC**: JWT Bearer Token, Bcrypt password hashing, Strict Role-Based Access Control (`ADMIN`, `MANAGER`, `DEVELOPER`), Admin-Controlled User Provisioning.

---

## 2. Quick-Start Setup & Execution Commands

### Prerequisites
- Python 3.12+ virtual environment (`backend/venv`)
- Node.js 18+ & npm
- PostgreSQL 14+ running on `localhost:5432` with database `devalign_db`
- *(Optional)* Ollama running locally on `http://localhost:11434`

### Step 1: Initialize Database & Seed Demo Data
```powershell
# In root or backend folder:
cd backend
venv\Scripts\python.exe scripts/seed_demo_data.py
```

### Step 2: Bootstrap/Verify First Admin (If Needed)
```powershell
venv\Scripts\python.exe scripts/create_admin.py --name "System Admin" --email "admin@devalign.ai" --password "admin123"
```

### Step 3: Launch FastAPI Backend Server
```powershell
cd backend
venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### Step 4: Launch Next.js Frontend Server
```powershell
cd frontend
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 3. Pre-Configured Demonstration Accounts

| Role | Email | Password | Primary Interface |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@devalign.ai` | `admin123` | Full Governance, User Management (`/admin/users`), Research Lab (`/research/ml`) |
| **MANAGER** | `manager@devalign.ai` | `manager123` | Project Intelligence (`/analytics`), AI Planner (`/ai-planning`), Task Assignment (`/tasks`) |
| **DEVELOPER** | `alice@devalign.ai` | `dev123` | Developer Workspace (`/tasks`), Real-Time Task Execution Timer, Work Intelligence (`/analytics/me`) |
| **DEVELOPER** | `rahul@devalign.ai` | `dev123` | Frontend Tasks, React/TypeScript Match Validation |
| **DEVELOPER** | `priya@devalign.ai` | `dev123` | High Workload & Capacity Pressure Demonstration |
| **DEVELOPER** | `david@devalign.ai` | `dev123` | DevOps Specialist (Unavailable Status Demonstration) |

---

## 4. End-to-End Demonstration Tour

### Stage 1: Authentication & Admin User Provisioning
1. Open `http://localhost:3000/login`.
2. Notice that open public registration has been securely removed.
3. Click the preset button **ADMIN** (`admin@devalign.ai` / `admin123`) and log in.
4. Go to **Administration & Access -> User Management** (`/admin/users`).
5. Provision a new user with role `DEVELOPER`, experience `3.5 years`, and availability `AVAILABLE`.
6. Inspect the user directory table, status badges, and active toggle switch.

### Stage 2: AI Project Planner & Task Breakdown (Manager)
1. Switch account to `manager@devalign.ai`.
2. Navigate to **✨ AI Project Planner** (`/ai-planning`).
3. Enter a prompt like *"Build a high-throughput payment reconciliation microservice with audit logging"*.
4. Generate the plan and inspect the decomposed tasks, priority, complexity, and required skills.
5. Export the plan to create live project and task records.

### Stage 3: Explainable Recommendations & Workload Alignment
1. Navigate to **Tasks** (`/tasks`) or **Assignments** (`/assignments`).
2. Select an unassigned task and view recommended developers.
3. Review the **3-Tier Match Categorization** (Eligible, Conditionally Eligible, Ineligible).
4. Expand the **XAI Factor Breakdown** (Skill Match, Workload Capacity, Experience, Performance).
5. Assign the task to the top recommended developer.

### Stage 4: Developer Execution & Live Task Timer
1. Log in as `alice@devalign.ai`.
2. Open **Tasks** (`/tasks`) or **My Work Intelligence** (`/analytics/me`).
3. Click **"Start Timer"** on the assigned in-progress task.
4. Observe the ticking `HH:MM:SS` timer and live duration accumulation.
5. Pause or complete the task to record `actual_hours` and trigger incentive calculation.

### Stage 5: Workload Analytics & Burnout Prevention
1. Navigate to **Workload Engine** (`/workload`).
2. Review the developer workload breakdown, weighted hours, and capacity utilization gauges.
3. Observe how overloaded developers trigger capacity warnings.

### Stage 6: Research & ML Evaluation Lab (Admin)
1. Switch back to `admin@devalign.ai`.
2. Navigate to **Research & ML Lab -> ML Model Evaluation** (`/research/ml`).
3. Compare model versions (`baseline-v1` vs. `baseline-v2` vs. `ml-ranking-v1`).
4. Inspect global SHAP feature importance charts.
5. Switch the active production model seamlessly.

---

## 5. Verification & Testing Commands

To run all automated security, RBAC, algorithm, and API tests:
```powershell
cd backend
venv\Scripts\pytest.exe -v
```

To verify frontend TypeScript compilation:
```powershell
cd frontend
npx tsc --noEmit
```
