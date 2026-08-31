# DevAlign AI — Demo Data Environment & Manual Reproduction Guide

## 1. Overview & Purpose
This guide explains the small, controlled development demo dataset for DevAlign AI. The dataset is designed to allow developers, reviewers, and researchers to manually test and reproduce all core functionalities of the system, including project management, developer skill proficiencies, task creation, assignment workflows, workload calculations, and baseline-v1 recommendations stored in PostgreSQL.

---

## 2. Environment & Database Configuration
- **Database Engine**: PostgreSQL 14+
- **Database Name**: `devalign_db`
- **Host**: `localhost:5432`
- **Default DATABASE_URL**: `postgresql://postgres:postgres@localhost:5432/devalign_db`
- **Environment**: `development`

---

## 3. How to Reset and Seed Local Development Database

### Step 1: Run Database Schema Migrations
Ensure Alembic has applied all schema migrations up to `head`:
```bash
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

### Step 2: Run the Idempotent Seed Script
Execute the seed script to clean existing development tables and populate the demo dataset:
```bash
cd backend
.\venv\Scripts\python.exe scripts/seed_demo_data.py
```
> [!NOTE]
> The seed script is **idempotent**. Running it multiple times safely resets the development database back to the exact clean demo dataset without duplicating records.

---

## 4. Development Login Credentials

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | System Admin | `admin@devalign.ai` | `admin123` |
| **Manager** | Project Manager | `manager@devalign.ai` | `manager123` |
| **Developer** | Alice Sharma | `alice@devalign.ai` | `dev123` |
| **Developer** | Rahul Patel | `rahul@devalign.ai` | `dev123` |
| **Developer** | Priya Mehta | `priya@devalign.ai` | `dev123` |
| **Developer** | David Wilson | `david@devalign.ai` | `dev123` |

---

## 5. Controlled Dataset Inventory

### Projects (2)
1. **FinTech Payment Platform** (Status: `ACTIVE`) — High-throughput payment gateway & transaction engine.
2. **University Learning Portal** (Status: `ACTIVE`) — Online student learning & course management system.

### Teams (2)
1. **Core Payments Team** (Project: FinTech Payment Platform)
2. **Portal Frontend Team** (Project: University Learning Portal)

### Skills (6)
- **Python** (Category: Backend)
- **FastAPI** (Category: Backend)
- **React** (Category: Frontend)
- **TypeScript** (Category: Frontend)
- **PostgreSQL** (Category: Database)
- **Docker** (Category: DevOps)

### Developers & Skill Levels (4)
1. **Alice Sharma** (Senior Backend Developer)
   - **Experience**: 6.0 years | **Performance Score**: 92.0 | **Availability**: `AVAILABLE`
   - **Skills**: Python (90.0), FastAPI (85.0), PostgreSQL (80.0), Docker (60.0)
2. **Rahul Patel** (Frontend Developer)
   - **Experience**: 4.5 years | **Performance Score**: 88.0 | **Availability**: `AVAILABLE`
   - **Skills**: React (95.0), TypeScript (90.0), Python (40.0)
3. **Priya Mehta** (Full-Stack Developer)
   - **Experience**: 5.0 years | **Performance Score**: 94.0 | **Availability**: `AVAILABLE`
   - **Skills**: Python (80.0), FastAPI (80.0), React (75.0), TypeScript (75.0), PostgreSQL (70.0)
4. **David Wilson** (DevOps Engineer)
   - **Experience**: 7.0 years | **Performance Score**: 85.0 | **Availability**: `UNAVAILABLE`
   - **Skills**: Docker (95.0), PostgreSQL (85.0), Python (60.0), FastAPI (50.0)

### Tasks (6)

| Task Title | Project | Required Skills | Est. Hours | Priority | Complexity | Status |
|---|---|---|---|---|---|---|
| **Build Authentication API** | FinTech | FastAPI (80), Python (85), PostgreSQL (75) | 20 | HIGH | HIGH | `IN_PROGRESS` |
| **Implement Payment Dashboard** | FinTech | React (85), TypeScript (80) | 16 | MEDIUM | MEDIUM | `IN_PROGRESS` |
| **Build Student Login Interface** | University | React (70), TypeScript (70) | 10 | LOW | LOW | `TODO` |
| **Design PostgreSQL Reporting Schema** | University | PostgreSQL (80), Python (70) | 18 | MEDIUM | MEDIUM | `TODO` |
| **Containerize Backend Service** | FinTech | Docker (90), FastAPI (60) | 12 | MEDIUM | MEDIUM | `COMPLETED` |
| **Build Course Management API** | University | Python (85), FastAPI (80), PostgreSQL (75) | 24 | HIGH | HIGH | `TODO` |

### Initial Active Assignments (3)
- **Alice Sharma** ➔ `Build Authentication API` (Status: `ACTIVE`)
- **Rahul Patel** ➔ `Implement Payment Dashboard` (Status: `ACTIVE`)
- **David Wilson** ➔ `Containerize Backend Service` (Status: `COMPLETED`)

---

## 6. Workload Calculation Breakdown

The workload engine calculates developer capacity using:
$$\text{Capacity Hours} = 40.0 \times \text{Availability Factor}$$
$$\text{Weighted Hours} = \sum (\text{Task Estimated Hours} \times \text{Complexity Weight})$$
$$\text{Workload Score} = \left(\frac{\text{Weighted Hours}}{\text{Capacity Hours}}\right) \times 100$$

### Current Demo Workload Summary:

| Developer | Active Tasks | Estimated Hours | Capacity Hours | Workload Score | Workload Status |
|---|---|---|---|---|---|
| **Alice Sharma** | 1 (`Build Authentication API`) | 20.0 hrs | 40.0 hrs | 65.0% | `BALANCED` |
| **Rahul Patel** | 1 (`Implement Payment Dashboard`) | 16.0 hrs | 40.0 hrs | 46.0% | `AVAILABLE` |
| **Priya Mehta** | 0 | 0.0 hrs | 40.0 hrs | 0.0% | `AVAILABLE` |
| **David Wilson** | 0 (Completed 1) | 0.0 hrs | 2.0 hrs (Unavailable) | 0.0% | `AVAILABLE` |

---

## 7. Recommendation Test Scenarios (`baseline-v1`)

The controlled dataset allows testing 4 distinct recommendation behaviors for task `Build Course Management API` (Requires Python, FastAPI, PostgreSQL):

- **Scenario A (Strong Match + Availability + Moderate Workload)**:
  - **Alice Sharma**: Python 90, FastAPI 85, PostgreSQL 80. Workload 65.0% (`BALANCED`).
  - **Expected Result**: Ranks **#1** or **#2** with high suitability score.
- **Scenario B (Good Match + Zero Workload)**:
  - **Priya Mehta**: Python 80, FastAPI 80, PostgreSQL 70. Workload 0.0% (`AVAILABLE`).
  - **Expected Result**: Ranks **#1** or **#2** due to low workload bonus.
- **Scenario C (Weak Skill Match)**:
  - **Rahul Patel**: Primary skills are React/TS. Python level only 40.
  - **Expected Result**: Ranks **#3** or lower due to poor skill match ratio.
- **Scenario D (Unavailable Developer Penalty)**:
  - **David Wilson**: Availability is `UNAVAILABLE`.
  - **Expected Result**: Heavily penalized or excluded by `baseline-v1` availability factor.

---

## 8. Manual Database Inspection Queries

Execute these queries in `psql` or DBeaver to verify database records directly in PostgreSQL:

```sql
-- 1. Verify Projects
SELECT id, name, status, created_by, created_at FROM projects;

-- 2. Verify Developers & User Info
SELECT dp.id AS dev_id, u.name, u.email, dp.experience_years, dp.availability_status, dp.performance_score
FROM developer_profiles dp
JOIN users u ON dp.user_id = u.id;

-- 3. Verify Tasks & Project Names
SELECT t.id AS task_id, t.title, p.name AS project_name, t.priority, t.complexity, t.estimated_hours, t.status
FROM tasks t
JOIN projects p ON t.project_id = p.id;

-- 4. Verify Task Skill Requirements
SELECT t.title AS task_title, s.name AS skill_name, ts.required_level
FROM task_skills ts
JOIN tasks t ON ts.task_id = t.id
JOIN skills s ON ts.skill_id = s.id;

-- 5. Verify Active Assignments
SELECT a.id AS assignment_id, t.title AS task_title, u.name AS developer_name, a.status, a.assigned_at
FROM assignments a
JOIN tasks t ON a.task_id = t.id
JOIN developer_profiles dp ON a.developer_id = dp.id
JOIN users u ON dp.user_id = u.id;

-- 6. Verify Persisted Recommendations
SELECT r.task_id, t.title AS task_title, u.name AS candidate_name, r.model_version, r.score, r.rank
FROM recommendations r
JOIN tasks t ON r.task_id = t.id
JOIN developer_profiles dp ON r.developer_id = dp.id
JOIN users u ON dp.user_id = u.id
ORDER BY r.task_id, r.rank;
```
