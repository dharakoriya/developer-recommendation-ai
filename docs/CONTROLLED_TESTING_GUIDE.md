# DevAlign AI — Controlled Test Environment User Testing Guide

## 1. Overview
This guide provides step-by-step instructions for non-technical project owners and QA testers to test DevAlign AI using the clean, controlled test environment.

---

## 2. Command to Reset Environment at Any Time

To return to a 100% clean test environment, run this single terminal command from the `backend/` directory:

```bash
cd backend
.\venv\Scripts\python.exe scripts/reset_and_seed_test_environment.py
```

> [!NOTE]
> Running this script will wipe manually created local test records and recreate the 6 core users, 2 projects, 2 teams, 4 developers, and 4 initial tasks.

---

## 3. Step-by-Step Testing Guide

### STEP 0 — Start the Application Services
1. **Backend Service**:
   ```bash
   cd backend
   .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend App**:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open browser to `http://localhost:3000`.

---

### STEP 1 — Test System Admin Access
- **Login Credentials**: `admin@devalign.ai` / `admin123`
- **What to Verify**:
  - Redirected to Executive Admin Dashboard displaying system-wide project, task, developer, and research metrics.
  - Sidebar contains both **Production Application** and **Research & ML Lab** sections.
  - Check bottom-right **Runtime Auth Debug** panel displays `CONSISTENT AUTH STATE ✓`.

---

### STEP 2 — Test Manager Operations
- **Login Credentials**: `manager@devalign.ai` / `manager123`
- **What to Verify**:
  - Redirected to Manager Team Dashboard displaying managed projects and team workload alerts.
  - Sidebar contains Production links. Research Lab section is hidden.
  - Direct access to `/research/ml` displays a 403 Access Denied screen.

---

### STEP 3 — Create a New Project & Team
1. Navigate to `/projects` and click **+ New Project**.
2. Enter Project Name: `Mobile Banking App`, select Status `ACTIVE`, and click **Create Project**.
3. Toast popup displays: `✓ Project "Mobile Banking App" created successfully!`.
4. Navigate to `/teams` and click **+ Create Team**.
5. Select `Mobile Banking App`, enter Team Name `Mobile iOS Team`, and click **Create Team**.

---

### STEP 4 — Create a New Task with Required Skills
1. Navigate to `/tasks` and click **+ Create Task**.
2. Fill out task details:
   - Title: `Build iOS Biometric Authentication`
   - Project: `Mobile Banking App`
   - Priority: `HIGH` | Complexity: `HIGH` | Hours: `16`
3. Click **Create Task**. Toast popup displays: `✓ Task created successfully!`.

---

### STEP 5 — Test Backend Recommendation Scenario (Alice vs. Others)
1. Navigate to `/recommendations`.
2. Select task **Build Payment Authentication API** (Requires Python 80, FastAPI 80, PostgreSQL 75).
3. Click **⚡ Find Best Developer**.
4. **Expected Result**:
   - **Alice Sharma** ranks **#1** (`92.4 / 100`) because she is a backend specialist with Python 95, FastAPI 90, PostgreSQL 85.
   - **David Wilson** has high skills but receives an availability penalty because he is marked `UNAVAILABLE`.

---

### STEP 6 — Test Frontend Recommendation Scenario (Rahul vs. Others)
1. Select task **Build Student Dashboard UI** (Requires React 80, TypeScript 80).
2. Click **⚡ Find Best Developer**.
3. **Expected Result**:
   - **Rahul Patel** ranks **#1** (`84.1 / 100`) because he is a frontend specialist with React 95, TypeScript 90.
   - Alice Sharma ranks lower due to lack of frontend skills.

---

### STEP 7 — Test Mixed Full-Stack Scenario (Priya Competitiveness)
1. Select task **Build Developer Activity Dashboard** (Requires React 70, TypeScript 70, Python 70).
2. Click **⚡ Find Best Developer**.
3. **Expected Result**:
   - **Priya Mehta** becomes competitive because she covers both frontend (React/TS) and backend (Python) skill requirements.

---

### STEP 8 — Assign Recommended Developer
1. Select task **Build Payment Authentication API**.
2. On Alice Sharma's candidate card, click **🟢 Assign Recommended Developer**.
3. Toast popup displays: `✓ Task assigned to Alice Sharma!`.

---

### STEP 9 — Developer Workspace Task Completion
1. Click **Sign Out** in top bar.
2. Sign in as `alice@devalign.ai` / `dev123`.
3. In **Developer Workspace**, locate `Build Payment Authentication API` in **My Assigned Tasks**.
4. Click **✓ Mark Complete**.
5. Toast popup displays: `✓ Task marked completed successfully!`.
6. Task status updates to `COMPLETED` and personal workload capacity recalculates.

---

## 4. How to Inspect Database Tables Locally

### Safely Query Tables using SQL:
```sql
SELECT email, role FROM users;
SELECT name, status FROM projects;
SELECT title, priority, status FROM tasks;
SELECT status, assigned_at FROM assignments;
```
