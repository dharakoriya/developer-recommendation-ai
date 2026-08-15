# DevAlign AI — Complete Local Development Setup Guide

This document provides step-by-step instructions to set up, configure, migrate, run, test, and troubleshoot **DevAlign AI** on a fresh Windows development machine.

---

## 1. System Architecture

```text
Browser Client (http://localhost:3000)
       │
       ▼ HTTP / REST
Next.js 14 Frontend (App Router, React 18, TypeScript)
       │
       ▼ REST API (http://localhost:8000/api)
FastAPI Backend (Python 3.12, Uvicorn, Pydantic v2, PyJWT)
       │
       ▼ SQLAlchemy 2.0 ORM / Alembic Migrations
PostgreSQL 15+ Database (localhost:5432 / devalign_db)
```

### Component Status
- **Currently Required & Active**: Next.js Frontend, FastAPI Backend REST API, PostgreSQL Database.
- **Planned / Future Component**: `ai-engine/` (Machine Learning models, SHAP/LIME explainability pipeline). Currently represented by a directory placeholder (`ai-engine/.gitkeep`); **not required** to run the current core application.

---

## 2. Prerequisites

Ensure the following software packages are installed on your Windows system before setting up the project:

| Tool | Required Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.0.0` or higher | `node --version` | Includes `npm` package manager (`npm --version`) |
| **Python** | `3.10` – `3.12` | `python --version` | Verified with Python 3.12.6 (64-bit) |
| **PostgreSQL** | `v15` or `v16` | Windows Service on Port `5432` | Requires local PostgreSQL database instance |
| **Git** | `v2.40+` | `git --version` | Required for cloning & version management |

> [!NOTE]
> PostgreSQL is **not** installed automatically by Node.js or Python package managers. You must download and install PostgreSQL for Windows manually.

---

## 3. Clone Repository

Open Windows PowerShell or Terminal:

```powershell
git clone https://github.com/your-username/devalign-ai.git
cd devalign-ai
```

---

## 4. Repository Folder Structure

```text
devalign-ai/
├── backend/                  # FastAPI Python backend application
│   ├── alembic/              # Database migration scripts & environment
│   ├── app/                  # Application source code (api, core, models, schemas)
│   ├── tests/                # Automated pytest test suites
│   ├── .env.example          # Environment variables template
│   ├── alembic.ini           # Alembic configuration file
│   └── requirements.txt      # Python dependencies list
├── frontend/                 # Next.js React frontend web application
│   ├── app/                  # Next.js App Router (pages & components)
│   ├── public/               # Static assets & public resources
│   ├── .env.example          # Frontend environment variables template
│   └── package.json          # Node.js dependencies & scripts
├── ai-engine/                # AI/ML Engine directory placeholder (Planned)
├── docs/                     # Comprehensive architecture & developer documentation
├── .vscode/                  # Workspace VS Code settings & interpreter configuration
└── README.md                 # Project landing page
```

---

## 5. Backend Python Setup

### Step 5.1: Create Virtual Environment

Navigate to the `backend/` directory and create a project-specific Python virtual environment:

```powershell
cd backend
python -m venv venv
```

> **What is `venv`?**  
> A virtual environment (`venv`) is an isolated Python environment that keeps project-specific dependencies separate from your global Windows Python installation.

### Step 5.2: Activate Virtual Environment & Install Dependencies

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

*(If PowerShell displays an `Execution_Policies` script error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

On Windows Command Prompt (`cmd.exe`):

```cmd
venv\Scripts\activate.bat
```

Now upgrade `pip` and install all required backend packages:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 6. VS Code / AntiGravity Interpreter Configuration

To ensure VS Code / Pylance resolves imports (`sqlalchemy`, `fastapi`, `pydantic`) without red squiggly underlines:

1. Open the project root in VS Code / AntiGravity.
2. Press `Ctrl + Shift + P` (Command Palette).
3. Type and select **`Python: Select Interpreter`**.
4. Select `Enter interpreter path...` and choose:
   ```text
   ${workspaceFolder}/backend/venv/Scripts/python.exe
   ```

*(This workspace has pre-configured settings in `.vscode/settings.json` and `backend/.vscode/settings.json` targeting this virtual environment).*

---

## 7. PostgreSQL Database Installation & Creation

### Step 7.1: Install PostgreSQL

1. Download the official PostgreSQL Windows installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
2. Run the installer and set the `postgres` superuser password (e.g. `postgres`).
3. Accept default port `5432` and complete installation.
4. Verify that the PostgreSQL Windows Service is running.

### Step 7.2: Create Project Database

Create the target database `devalign_db` using **pgAdmin** or **SQL Command Line**:

#### Option A: Using pgAdmin 4
1. Open pgAdmin.
2. Right-click **Databases** → **Create** → **Database...**
3. Enter Database name: `devalign_db`
4. Click **Save**.

#### Option B: Using SQL Shell (`psql`) or Command Line
```sql
CREATE DATABASE devalign_db;
```

---

## 8. Environment Variables Configuration

The project uses environment files (`.env`) to manage credentials and configuration cleanly.

### Step 8.1: Backend Environment (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```powershell
# From backend/ folder
cp .env.example .env
```

Edit `backend/.env` with your local values:

```ini
PROJECT_NAME="DevAlign AI Backend"
ENVIRONMENT=development
API_PREFIX=/api
PORT=8000

# Format: postgresql://<username>:<password>@<host>:<port>/<database_name>
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devalign_db

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002

JWT_SECRET=devalign-secret-key-change-in-production-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

#### Environment Variables Reference

| Variable Name | Purpose | Required | Example Safe Value |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | Display name of the backend service | Yes | `"DevAlign AI Backend"` |
| `ENVIRONMENT` | Running mode (`development`, `staging`, `production`) | Yes | `development` |
| `API_PREFIX` | Base REST API route prefix | Yes | `/api` |
| `PORT` | FastAPI server listening port | Yes | `8000` |
| `DATABASE_URL` | SQLAlchemy PostgreSQL connection URI | Yes | `postgresql://postgres:postgres@localhost:5432/devalign_db` |
| `CORS_ORIGINS` | Allowed frontend origins for CORS | Yes | `http://localhost:3000,http://127.0.0.1:3000` |
| `JWT_SECRET` | Secret key for signing HS256 Bearer JWTs | Yes | *(Use random secret in production)* |
| `JWT_ALGORITHM` | JWT signing algorithm | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan in minutes | Yes | `1440` (24 Hours) |

### Step 8.2: Frontend Environment (`frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local`:

```powershell
# Navigate to frontend/
cd ../frontend
cp .env.example .env.local
```

`frontend/.env.local`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 9. Run Database Migrations

Once PostgreSQL `devalign_db` is created and `backend/.env` is configured, run Alembic migrations to generate all 13 application tables:

```powershell
# From backend/ folder with venv activated:
cd ../backend
.\venv\Scripts\alembic upgrade head
```

### Generated Schema Tables
1. `users`
2. `developer_profiles`
3. `skills`
4. `developer_skills`
5. `projects`
6. `teams`
7. `team_members`
8. `tasks`
9. `task_skills`
10. `assignments`
11. `recommendations`
12. `recommendation_explanations`
13. `workload_records`

---

## 10. Frontend Setup & Build

Navigate to `frontend/` and install Node.js dependencies:

```powershell
cd ../frontend
npm install
```

To run the Next.js development server:

```powershell
npm run dev
```

Output:
```text
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
```

*(Note: Next.js defaults to port `3000`. If port 3000 is already in use by another local app, Next.js automatically uses `http://localhost:3001` or `http://localhost:3002`).*

---

## 11. Complete System Startup Workflow

To run the full stack during local development, open two separate terminal windows:

### Terminal 1 — Backend API (FastAPI)
```powershell
cd devalign-ai/backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```
- **REST API Base**: `http://localhost:8000`
- **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Terminal 2 — Frontend Application (Next.js)
```powershell
cd devalign-ai/frontend
npm run dev
```
- **Web App Interface**: [http://localhost:3000](http://localhost:3000)

---

## 12. Complete Verification Checklist

Follow this checklist to confirm your environment is operational:

- [ ] **Git & Python & Node Installed**: `git --version`, `python --version`, `node --version`.
- [ ] **PostgreSQL Service Active**: Local PostgreSQL running on port `5432`.
- [ ] **Database Created**: `devalign_db` database exists.
- [ ] **Virtual Environment**: `backend/venv` created and dependencies installed.
- [ ] **Environment Configuration**: `backend/.env` and `frontend/.env.local` created from `.env.example`.
- [ ] **Database Migrations Executed**: `alembic upgrade head` completed cleanly.
- [ ] **Backend Running**: FastAPI accessible at `http://localhost:8000/docs`.
- [ ] **Backend Health Check**: `http://localhost:8000/api/health` returns `status: ok` and `database.status: connected`.
- [ ] **Frontend Running**: Next.js accessible at `http://localhost:3000`.
- [ ] **Frontend → Backend Communication**: Web interface displays `Connected (OK)` for FastAPI & PostgreSQL.
- [ ] **Authentication Flow**: User Registration, Login, and `/protected` area work.
- [ ] **Developer & Skills Pages**: `/skills`, `/developers`, and `/developers/[id]` function cleanly.

---

## 13. Running Automated Test Suites

### Backend Unit & Integration Tests (`pytest`)

Execute the complete backend automated test suite (23 tests covering authentication, JWT claims, database schema constraints, skills catalog, developer profiles, and role permissions):

```powershell
# From backend/ folder with venv activated:
.\venv\Scripts\pytest
```

Expected Result: `23 passed in ~12s`.

### Frontend TypeScript Compilation Check (`tsc`)

Execute static type checking across all Next.js pages and components:

```powershell
# From frontend/ folder:
npx tsc --noEmit
```

Expected Result: Finished with `0 errors`.

---

## 14. Health Check & Troubleshooting Guide

### Issue 1: Frontend says `FastAPI Backend: Disconnected`
- **Cause**: Backend server is not running or running on a non-standard port.
- **Solution**: Check Terminal 1 to ensure `python -m uvicorn app.main:app --reload --port 8000` is running. Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.

### Issue 2: Backend Health Check says `database: disconnected`
- **Cause**: PostgreSQL service is stopped or credentials in `backend/.env` are incorrect.
- **Solution**: Open Windows Services (`services.msc`), find `postgresql-x64-15` / `postgresql-x64-16`, and click **Start**. Ensure `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devalign_db` matches your local database credentials.

### Issue 3: VS Code shows `Import "sqlalchemy" could not be resolved`
- **Cause**: VS Code Pylance is using global Python instead of the virtual environment.
- **Solution**: Press `Ctrl + Shift + P` → `Python: Select Interpreter` → Select `backend/venv/Scripts/python.exe`.

### Issue 4: Port 8000 or Port 3000 already in use
- **Cause**: Another local process is occupying port 8000 or 3000.
- **Solution**:
  - To find process on port 8000: `netstat -ano | findstr :8000`
  - To stop process: `taskkill /PID <PID_NUMBER> /F`

---

## 15. Git & Security Best Practices

> [!CAUTION]
> **NEVER COMMIT SENSITIVE FILES OR CREDENTIALS TO GIT.**

Ensure the following files remain ignored by `.gitignore`:
- `backend/.env`
- `frontend/.env.local`
- `backend/venv/`
- `frontend/node_modules/`
- `frontend/.next/`

Only `*.env.example` templates should be committed to source control.

---

## 16. New Developer Quick Start Summary

```powershell
# 1. Clone project
git clone https://github.com/your-username/devalign-ai.git
cd devalign-ai

# 2. Setup Backend & Virtual Environment
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env

# 3. Create PostgreSQL DB & Run Migrations (Ensure PostgreSQL is running locally)
# (In psql / pgAdmin: CREATE DATABASE devalign_db;)
.\venv\Scripts\alembic upgrade head

# 4. Start Backend Server (Terminal 1)
python -m uvicorn app.main:app --reload --port 8000

# 5. Setup & Start Frontend (Terminal 2)
cd ../frontend
npm install
cp .env.example .env.local
npm run dev

# 6. Verify Applications:
# Frontend App: http://localhost:3000
# Backend Swagger: http://localhost:8000/docs
# Backend Health Check: http://localhost:8000/api/health
```
