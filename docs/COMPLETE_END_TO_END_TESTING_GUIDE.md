# COMPLETE END TO END TESTING GUIDE — Non-Expert Walkthrough

This manual is written specifically for non-expert users. You do not need to inspect source code. Open the application, follow the exact steps below, and verify the expected results.

---

## 1. System Startup Commands

1. **Start PostgreSQL**: Ensure PostgreSQL service is active on port `5432`.
2. **Start Backend**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```
3. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 2. Step-by-Step Feature Test Suite

### STEP 01 — System Health & API Connectivity
- **Target Route**: `http://localhost:8000/api/health`
- **User Role**: Public / Any
- **Steps**:
  1. Open your web browser.
  2. Enter URL: `http://localhost:8000/api/health`.
- **Expected Result**: A JSON response reading `{"status": "healthy"}` with HTTP 200.
- **Viva Explanation**: "This endpoint acts as our system heartbeat check, verifying database connection and backend API readiness."

---

### STEP 02 — User Authentication & Sign Out Redirect
- **Target Route**: `http://localhost:3000/login`
- **User Role**: Manager (`manager@devalign.ai` / `Manager123!`)
- **Steps**:
  1. Navigate to `/login`.
  2. Enter Email: `manager@devalign.ai`, Password: `Manager123!`. Click **Sign In**.
  3. Verify the operational dashboard loads.
  4. Click the **Sign out** button in the top right header navigation bar.
- **Expected Result**: An info toast appears reading *"Signed out successfully"*, and the browser immediately redirects to `/login`.
- **Internal Action**: Clears `devalign_token` and `devalign_user` from browser `localStorage` and resets React `AuthContext` state.

---

### STEP 03 — Role-Based Access Control (Forbidden Route Protection)
- **Target Route**: `http://localhost:3000/projects/new`
- **User Role**: Developer (`dev.rahul@devalign.ai` / `Dev123!`)
- **Steps**:
  1. Log in as `dev.rahul@devalign.ai`.
  2. Manually type `http://localhost:3000/projects/new` in your browser address bar and press Enter.
- **Expected Result**: An HTTP 403 Forbidden screen appears displaying: *"Access Denied: Your account role (DEVELOPER) does not have authorization to access /projects/new."*
- **Internal Action**: `AppShell.tsx` evaluates `hasPermission(user.role, pathname)` and blocks navigation. Backend API `POST /api/projects` also enforces `require_roles(UserRole.ADMIN, UserRole.MANAGER)` returning `403 Forbidden`.

---

### STEP 04 — Creating a Project
- **Target Route**: `/projects`
- **User Role**: Manager (`manager@devalign.ai`)
- **Steps**:
  1. Navigate to `/projects`.
  2. Click the **+ Create Project** button.
  3. Enter Name: `FinTech Payment Modernization`, Description: `Containerized payment gateway microservices`, Status: `ACTIVE`.
  4. Click **Create Project**.
- **Expected Result**: A green toast reading *"Project 'FinTech Payment Modernization' created successfully!"* appears, and the new project card renders in the catalog grid.

---

### STEP 05 — Task Creation with Project Bifurcation
- **Target Route**: `/tasks`
- **User Role**: Manager (`manager@devalign.ai`)
- **Steps**:
  1. Navigate to `/tasks`.
  2. Click **+ Create Task**.
  3. In the modal, select Target Project: `FinTech Payment Modernization`.
  4. Enter Title: `Implement Stripe Webhook Handler`, Description: `Process asynchronous payment events`, Est. Hours: `16.0`, Complexity: `HIGH`, Priority: `CRITICAL`.
  5. Click **Create Task**.
- **Expected Result**: Task appears in the main tasks table displaying a purple project badge reading `📁 FinTech Payment Modernization`.
- **View Toggle**: Click **Group by Project** toggle to view tasks organized under dedicated project cards.

---

### STEP 06 — AI Developer Recommendation & Assignment Execution
- **Target Route**: `/recommendations`
- **User Role**: Manager (`manager@devalign.ai`)
- **Steps**:
  1. Navigate to `/recommendations`.
  2. Select task: `Implement Stripe Webhook Handler`.
  3. Review candidate ranking cards. Observe Candidate #1's score breakdown (Skill match, Availability, Workload penalty).
  4. Click **Assign Developer** on Candidate #1. Enter note: `Approved for sprint 1`.
  5. Click **Confirm Assignment**.
- **Expected Result**: Success toast appears; task assignment status updates to `ALLOCATED`.
