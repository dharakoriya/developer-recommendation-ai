# DevAlign AI — Frontend User & Testing Guide

## 1. Executive Summary
DevAlign AI is an Explainable Developer Recommendation and Workload Balancing System. This guide details the production frontend user experience, role-based authentication flow, interactive management workflow (Projects, Developers, Teams, Tasks, Assignments, Workload), baseline recommendation engine verification, and controlled test scenarios.

---

## 2. Getting Started & Authentication Flow

### Sign In
1. Navigate to `http://localhost:3000/login`.
2. Enter your credentials or click a **Quick Demo Account** shortcut:
   - **Project Manager**: `manager@devalign.ai` / `manager123`
   - **System Admin**: `admin@devalign.ai` / `admin123`
3. Click **Sign In**.
4. Upon successful authentication, you are automatically redirected to the **Executive Dashboard** (`/dashboard`).

### Role-Based Access Controls
- **Unauthenticated Access**: Direct attempts to access protected pages (`/dashboard`, `/projects`, `/tasks`, `/developers`, `/recommendations`, `/workload`, `/research/*`) automatically redirect to `/login`.
- **Session Expiration**: If a JWT session expires or is cleared from browser storage, protected API requests trigger an automatic logout and return the user to `/login`.

---

## 3. Production Core Workflows

### Step 1: Manage Projects (`/projects`)
- View active, completed, or archived projects.
- Click **+ New Project** to open the creation modal:
  - Enter Project Name (e.g. `Mobile E-Commerce App`).
  - Enter Description and select Status (`ACTIVE`).
  - Click **Create Project** to save directly to PostgreSQL.

### Step 2: Manage Teams (`/teams`)
- View engineering teams grouped by project.
- Click **+ Create Team**:
  - Select target Project.
  - Enter Team Name (e.g. `Mobile Client Team`) & Description.
  - Click **Create Team**.

### Step 3: Manage Developers & Skills (`/developers`)
- Search developer directory by name or filter by availability (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`).
- View experience years, performance scores (0–100), live workload scores, and skill proficiencies.
- Click **+ Add Skill** on any developer card:
  - Select Skill (e.g. `React`, `Python`, `FastAPI`, `Docker`).
  - Set Proficiency Level (0–100).
  - Click **Add Skill** to update the profile immediately.

### Step 4: Manage Tasks (`/tasks`)
- View tasks with skill requirements, estimated hours, complexity, priority, and assignment status.
- Click **+ Create Task**:
  - Select Project.
  - Enter Task Title (e.g. `Build GraphQL Gateway`), Description, Estimated Hours (`16.0`), Complexity (`HIGH`), and Priority (`CRITICAL`).
  - Click **Create Task**.
- Click **⚡ Find Best Developer** on any task to jump straight to the Recommendation Engine.

---

## 4. Developer Recommendation Engine (`/recommendations`)

### Recommendation Generation Workflow
1. Select **Project** and **Task** from the dropdown selectors.
2. The engine generates ranked candidate recommendations using `deterministic_baseline / baseline-v1`.
3. Each Candidate Card displays:
   - **Candidate Rank** (`#1`, `#2`, etc.)
   - **Developer Name & Experience**
   - **Recommendation Score** (0–100)
   - **Skill Match % & Coverage %**
   - **Availability Status & Workload Indicator Bar**
   - **"Why this developer?"**: Modal presenting SHAP/baseline contribution breakdowns.
   - **"Assign Developer"**: One-click assignment creation that immediately updates developer workload across the application.

---

## 5. Controlled Test Scenarios Verification

To verify that recommendations adjust dynamically based on skill requirements, workload, and availability, test the 4 controlled scenarios in the seed dataset:

### Scenario A — Strong Backend Match & Capacity (Alice Sharma)
- **Task**: `Build Authentication API` (Requires FastAPI 80, Python 85, PostgreSQL 75)
- **Candidate State**: Alice has Python 90, FastAPI 85, PostgreSQL 80. Workload = 65.0% (`BALANCED`).
- **Expected Ranking**: Ranks **#1** or **#2** with high suitability score.

### Scenario B — Strong Frontend Match (Rahul Patel)
- **Task**: `Implement Payment Dashboard` (Requires React 85, TypeScript 80)
- **Candidate State**: Rahul has React 95, TypeScript 90. Workload = 46.0% (`AVAILABLE`).
- **Expected Ranking**: Ranks **#1** for frontend tasks.

### Scenario C — Workload Impact (Priya Mehta vs. Alice Sharma)
- **Task**: `Build Course Management API` (Requires Python 85, FastAPI 80)
- **Candidate State**: Priya has zero active tasks (0.0% workload), whereas Alice has 65.0% workload.
- **Expected Ranking**: Priya receives a workload capacity bonus ranking above overloaded/balanced candidates.

### Scenario D — Availability Penalty (David Wilson)
- **Task**: `Containerize Backend Service` (Requires Docker 90)
- **Candidate State**: David Wilson has Docker 95 proficiency but is marked `UNAVAILABLE`.
- **Expected Ranking**: Availability penalty lowers rank or flags unavailability.

---

## 6. Workload Balancing Engine (`/workload`)
- Displays real-time capacity utilization across all developer profiles.
- Color-coded workload score badges:
  - `0% – 49%`: **AVAILABLE** (Green)
  - `50% – 80%`: **BALANCED** (Blue)
  - `81% – 100%`: **HIGH** (Amber)
  - `> 100%`: **OVERLOADED** (Rose)

---

## 7. Research & Governance Modules (`/research/*`)
Research pages are visually demarcated with prominent **`RESEARCH / EXPERIMENTAL`** headers:
- **ML Model Benchmarks** (`/research/ml`): Evaluation metrics for Random Forest & XGBoost research models.
- **Research Dataset** (`/research/dataset`): Real-world dataset label accumulation & readiness check.
- **Dataset Monitoring** (`/research/dataset/monitoring`): Positive ratio tracking & weak vs. validated label breakdown.
- **Audit Logging** (`/recommendations/audit`): Immutable recommendation-time audit log records.
