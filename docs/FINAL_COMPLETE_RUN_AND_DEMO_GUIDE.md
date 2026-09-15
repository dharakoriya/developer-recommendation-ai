# DEVAlign AI — Final Complete Run & Demonstration Guide
**Comprehensive Zero-to-Running Setup, Database Management, Business Walkthrough & Operations Manual**

---

## 📌 Table of Contents

- [PART A — First Time Fresh-Machine Setup](#part-a--first-time-fresh-machine-setup)
- [PART B — Normal Daily Startup](#part-b--normal-daily-startup)
- [PART C — System Administrator Demonstration](#part-c--system-administrator-demonstration)
- [PART D — Project Manager Demonstration](#part-d--project-manager-demonstration)
- [PART E — Developer Workspace Demonstration](#part-e--developer-workspace-demonstration)
- [PART F — Complete Task Lifecycle End-to-End](#part-f--complete-task-lifecycle-end-to-end)
- [PART G — Centralized Recommendation Model Switch](#part-g--centralized-recommendation-model-switch)
- [PART H — AI Project Planner Demonstration](#part-h--ai-project-planner-demonstration)
- [PART I — Research & Machine Learning Lab](#part-i--research--machine-learning-lab)
- [PART J — Comprehensive Troubleshooting Matrix](#part-j--comprehensive-troubleshooting-matrix)
- [PART K — Clean Database Reset Procedure](#part-k--clean-database-reset-procedure)
- [PART L — Copy-Paste Command Reference](#part-l--copy-paste-command-reference)

---

# PART A — FIRST TIME FRESH-MACHINE SETUP

### 1. Prerequisites & System Requirements
| Software | Required Version | Purpose | Verification Command |
| :--- | :--- | :--- | :--- |
| **Python** | 3.11+ (Tested on 3.12.6) | FastAPI Backend, SQLAlchemy, ML Services | `python --version` |
| **Node.js** | 18.0+ (Tested on 20.x+) | Next.js 14 Frontend Application | `node --version` |
| **npm** | 9.0+ | Frontend package management | `npm --version` |
| **PostgreSQL** | 14.0+ (Tested on 16.x) | Primary Relational Database Engine | `psql --version` |
| **Git** | 2.x+ | Version control & repository tracking | `git --version` |
| **Ollama** *(Optional)* | 0.1.30+ | Local LLM for AI Project Planner | `ollama --version` |

---

### 2. Exact Project Directory Paths
Assuming the repository is located at `D:\Custom Project\dhara\devalign-ai`:
- **Project Root**: `D:\Custom Project\dhara\devalign-ai`
- **Backend Service**: `D:\Custom Project\dhara\devalign-ai\backend`
- **Frontend App**: `D:\Custom Project\dhara\devalign-ai\frontend`
- **Research ML Module**: `D:\Custom Project\dhara\devalign-ai\research`
- **Documentation**: `D:\Custom Project\dhara\devalign-ai\docs`
- **Management Scripts**: `D:\Custom Project\dhara\devalign-ai\backend\scripts`

---

### 3. Backend Python Environment Setup
Open PowerShell as Administrator (or standard user) and run:
```powershell
cd "D:\Custom Project\dhara\devalign-ai\backend"
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```
*Expected Result*: All dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `alembic`, `pydantic-settings`, `scikit-learn`, `xgboost`, `shap`, etc.) install cleanly.

---

### 4. Frontend Node.js Environment Setup
Open a second PowerShell terminal:
```powershell
cd "D:\Custom Project\dhara\devalign-ai\frontend"
npm install
```
*Expected Result*: Node modules install cleanly without peer dependency conflicts.

---

### 5. PostgreSQL Database Creation
Ensure PostgreSQL service is running on `localhost:5432`.
```powershell
# In PowerShell or Command Prompt using psql:
psql -U postgres -c "CREATE DATABASE devalign_db;"
```
*(If prompted, enter your PostgreSQL postgres user password).*

---

### 6. Environment Configuration (.env)
Edit `D:\Custom Project\dhara\devalign-ai\backend\.env`:
```env
PROJECT_NAME="DevAlign AI Backend"
ENVIRONMENT=development
API_PREFIX=/api
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devalign_db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=devalign-secret-key-change-in-production-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider Configuration
AI_PROVIDER=heuristic
AI_MODEL=llama3
OLLAMA_HOST=http://localhost:11434

# Active Production Recommendation Model (baseline-v1 or baseline-v2)
RECOMMENDATION_MODEL=baseline-v2
```

Edit `D:\Custom Project\dhara\devalign-ai\frontend\.env.local` (or `.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### 7. Run Database Migrations
In the backend terminal:
```powershell
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\activate
alembic upgrade head
```
*Expected Result*: Alembic applies migrations up to `d6e8f1a2b3c4` (`add_minute_second_timer_fields`).

---

### 8. Seed the Comprehensive Demonstration Database
Run the idempotent demonstration seeder:
```powershell
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\python scripts/seed_demo_data.py
```
*Expected Result*:
```
[OK] DEMONSTRATION DATABASE SEEDED SUCCESSFULLY!
=================================================================
  Users Created        : 6 (1 Admin, 1 Manager, 4 Developers)
  Projects Created     : 3 (FinTech, University Portal, Analytics)
  Teams Created        : 3 (Backend Core, Portal UI, Platform)
  Developers Seeded    : 4 (Alice, Rahul, Priya, David)
  Skills Seeded        : 7 (Python, FastAPI, React, TS, PG, Docker, UI/UX)
  Tasks Seeded         : 10 (Covering all 12 Demonstration Scenarios)
  Assignments Seeded   : 5 (3 Active, 1 Completed, 1 In-Progress)
  Incentive Records    : 3 Ledgers Seeded with Multi-Factor Bonuses
  Recommendations      : Pre-generated for all unassigned tasks
=================================================================
```

---

# PART B — NORMAL DAILY STARTUP

To run DevAlign AI on any day:

### Terminal 1 — Backend Service
```powershell
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### Terminal 2 — Frontend Application
```powershell
cd "D:\Custom Project\dhara\devalign-ai\frontend"
npm run dev
```
- Web Application: `http://localhost:3000`

### Terminal 3 — Optional Ollama Service (For Local LLM Planner)
```powershell
ollama serve
# In another tab (one-time download):
ollama pull llama3
```

---

# PART C — SYSTEM ADMINISTRATOR DEMONSTRATION

### Credentials: `admin@devalign.ai` / `admin123`
1. **Login**: Navigate to `http://localhost:3000/login`, enter credentials.
2. **Dashboard**: View high-level enterprise statistics (Total Users, Projects, Active Tasks, Workload Utilization).
3. **Developers Matrix**: Navigate to `/developers`. Inspect 4 developer profiles, skill levels, and availability states.
4. **Skills Management**: Navigate to `/skills`. View or add core engineering skills and categories.
5. **Analytics**: Navigate to `/analytics`. View cross-project velocity, capacity utilization, and system-wide telemetry.

---

# PART D — PROJECT MANAGER DEMONSTRATION

### Credentials: `manager@devalign.ai` / `manager123`
1. **Login**: Sign in with manager credentials.
2. **Projects & Teams**: Navigate to `/projects` and `/teams`. View the 3 seeded projects and their respective engineering teams.
3. **Task Weighting**: Navigate to `/tasks`. Notice the calculated **Task Weight Scores** and categories (`LIGHT`, `MODERATE`, `HEAVY`, `CRITICAL`).
4. **Intelligent Recommendation**: Open Task 1 (*"Build Payment Webhook Ingestion API"*). Click **"Find Best Developer"**.
   - Inspect rank #1 match (**Alice Sharma**) with transparent SHAP-aligned contribution breakdowns.
   - Inspect excluded candidates (**David Wilson** - Unavailable).
5. **Assign Task**: Click **"Assign to Alice Sharma"** to convert the task to `ASSIGNED` state.
6. **Risk Management**: Navigate to `/risk`. View the risk engine detecting imminent deadline risks and overloaded developers.

---

# PART E — DEVELOPER WORKSPACE DEMONSTRATION

### Credentials: `alice@devalign.ai` / `dev123`
1. **Login**: Sign in as Alice Sharma.
2. **Role-Specific Workspace**: Notice that organizational management routes (Projects, Teams, System Config) are inaccessible per strict RBAC.
3. **My Tasks**: Open Task 3 (*"Build Authentication & RBAC Engine"*).
4. **Live Execution Timer**:
   - Notice the live timer ticking in `HH:MM:SS`.
   - Click **"Pause Timer"** -> timer stops and saves actual time.
   - Click **"Resume Timer"** -> timer continues seamlessly.
5. **Task Completion & Incentives**:
   - Click **"Complete Task"**.
   - Navigate to `/incentives` (or Developer Profile). View Alice's 5-day active streak, earned badges, and 850 reward points breakdown.

---

# PART F — COMPLETE TASK LIFECYCLE END-TO-END

```mermaid
graph TD
    A[1. Create Task] --> B[2. Calculate Task Weight]
    B --> C[3. Generate Baseline Recommendation]
    C --> D[4. Manager Assigns Best Developer]
    D --> E[5. Developer Starts Live Execution Timer]
    E --> F[6. Pause / Resume / Log Actual Seconds]
    F --> G[7. Developer Completes Task]
    G --> H[8. Workload & Capacity Recalculated]
    H --> I[9. Performance Metrics & Incentives Stamped]
    I --> J[10. Risk & Analytics Dashboards Updated]
```

1. **Create Task**: Manager creates task with Title, Priority, Complexity, Estimated Hours, and Required Skills.
2. **Weight Computation**: System computes Task Weight Score (1..100) using the 4-factor formula.
3. **Recommendation**: Recommendation engine scores candidates against skills, coverage, workload, availability, experience, and performance.
4. **Assignment**: Task is assigned to candidate; assignment is recorded in database.
5. **Timer Execution**: Developer runs minute/second timer while performing work.
6. **Task Completion**: `completed_by` and `completed_at` are stamped; `AssignmentStatus` set to `COMPLETED`.
7. **Intelligence Updates**: Developer performance, streaks, badges, incentive ledger, workload capacity, and project risk update automatically.

---

# PART G — CENTRALIZED RECOMMENDATION MODEL SWITCH

DevAlign AI supports zero-code switching between **Baseline-v1** (6-factor classic heuristic) and **Baseline-v2** (7-factor production model with Task Weight Compatibility & Anti-Monopoly).

### To Switch Models:
1. Open `backend/.env`.
2. Change the line:
   ```env
   # Option A: Classic Baseline v1
   RECOMMENDATION_MODEL=baseline-v1
   
   # Option B: Advanced Production Baseline v2
   RECOMMENDATION_MODEL=baseline-v2
   ```
3. Restart backend (or let uvicorn auto-reload).
4. **Verification Endpoint**:
   ```powershell
   curl http://localhost:8000/api/recommendations/metadata/model
   ```
   *Returns*: `{"model_type": "deterministic_baseline", "model_version": "baseline-v2", ...}`

*Automatic Invalidation*: When fetching task recommendations, the backend automatically detects if persisted records match the active `RECOMMENDATION_MODEL`. If mismatched or stale, it auto-regenerates fresh recommendations using the active engine.

---

# PART H — AI PROJECT PLANNER DEMONSTRATION

1. Login as `manager@devalign.ai`.
2. Navigate to `/planner`.
3. Enter Project Concept:
   - **Title**: `AI Micro-Service Platform`
   - **Description**: `Containerized event-driven microservices architecture with Kafka streaming, gRPC inter-service communication, and PostgreSQL storage.`
   - **Duration**: `6 Weeks`
4. Select Provider: `heuristic` (runs 100% offline) or `ollama` (uses local LLM).
5. Click **"Generate Project Plan"**.
6. Review the generated work breakdown structure, task weights, and skill prerequisites.
7. Click **"Approve & Create Project"** -> Creates the project and all tasks directly in PostgreSQL!

---

# PART I — RESEARCH & MACHINE LEARNING LAB

The research lab (`research/`) contains experimental ML models (Random Forest, XGBoost) and SHAP explainers isolated from deterministic production pipelines.

### Run Research Pipeline:
```powershell
cd "D:\Custom Project\dhara\devalign-ai"
# 1. Generate Synthetic Benchmark Dataset
python research/split/dataset_splitter.py

# 2. Train Random Forest & XGBoost Models
python research/ml/training/train_models.py

# 3. Generate Global & Local SHAP Feature Importance
python research/ml/explainability/global_explanation.py
```
*Visualizer*: Open `http://localhost:3000/research` to inspect the SHAP feature importance charts.

---

# PART J — COMPREHENSIVE TROUBLESHOOTING MATRIX

| Symptom | Probable Cause | Diagnostic Check | Resolution / Fix |
| :--- | :--- | :--- | :--- |
| `psycopg2.OperationalError: could not connect to server` | PostgreSQL is not running or bad credentials | Check `services.msc` or run `psql -U postgres` | Start PostgreSQL service; verify password in `DATABASE_URL` in `backend/.env`. |
| `FastAPI: 401 Unauthorized` | Missing or expired JWT token | Inspect localStorage `token` in browser devtools | Sign out and sign in again via `/login`. |
| `FastAPI: 403 Forbidden` | Accessing route disallowed for user's role | Check user role in JWT payload | Use appropriate account (`admin@devalign.ai`, `manager@devalign.ai`, `alice@devalign.ai`). |
| `Alembic Target database is not up to date` | Pending unapplied database migrations | Run `alembic current` | Run `alembic upgrade head` in `backend/`. |
| `Recommendation shows old model version` | Mismatched `.env` or persisted cache | Check `GET /api/recommendations/metadata/model` | Change `RECOMMENDATION_MODEL` in `backend/.env` and restart uvicorn. |
| `Timer displays NaN or does not tick` | Missing `total_actual_seconds` field | Inspect task payload in network tab | Run `python backend/scripts/seed_demo_data.py` to reset schema state. |
| `AI Planner: Connection refused on 11434` | Ollama is selected but not running | Check if `ollama serve` is active | Start Ollama with `ollama serve` or switch `AI_PROVIDER=heuristic` in `backend/.env`. |
| `Frontend: Module not found / Build error` | Missing node dependencies | Run `npm list` in `frontend/` | Run `npm install` in `frontend/`. |

---

# PART K — CLEAN DATABASE RESET PROCEDURE

To perform a complete clean wipe and reset of the development database to the clean demonstration state:

```powershell
# 1. Stop backend if running (Ctrl+C)
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\activate

# 2. Re-apply all database migrations
alembic upgrade head

# 3. Seed demonstration dataset
python scripts/seed_demo_data.py

# 4. Start backend
uvicorn app.main:app --reload --port 8000
```

---

# PART L — COPY-PASTE COMMAND REFERENCE

### 1. First Time Setup Commands
```powershell
# Backend Setup
cd "D:\Custom Project\dhara\devalign-ai\backend"
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_demo_data.py

# Frontend Setup
cd "D:\Custom Project\dhara\devalign-ai\frontend"
npm install
```

### 2. Daily Start Commands
```powershell
# Terminal 1: Backend Service
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend App
cd "D:\Custom Project\dhara\devalign-ai\frontend"
npm run dev
```

### 3. Automated Test Verification Commands
```powershell
# Backend Full Test Suite (141 Tests across 29 Suites)
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\pytest

# Frontend TypeScript Type Check
cd "D:\Custom Project\dhara\devalign-ai\frontend"
npx tsc --noEmit
```

### 4. Database Reset & Seeding Command
```powershell
cd "D:\Custom Project\dhara\devalign-ai\backend"
.\venv\Scripts\python scripts/seed_demo_data.py
```
