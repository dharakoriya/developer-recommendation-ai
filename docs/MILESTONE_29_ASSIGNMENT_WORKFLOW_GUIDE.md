# Milestone 29 — Assignment Lifecycle Synchronization, Developer Workspace & Task Execution Workflow Guide

---

## 1. What Was Wrong? (Root Cause Analysis)

During investigation of the task assignment workflow, the following root causes were identified:

1. **Schema & Frontend Field Name Disconnect**:
   - The backend `TaskResponse` schema returned the active assignment object under `current_assignment: Optional[AssignmentResponse]`.
   - The frontend `TaskItem` interface on `/tasks` and `TaskDetail` interface on `/tasks/[id]` expected flat string properties `assigned_developer_name` and `assigned_developer_id`.
   - Because `assigned_developer_name` was `undefined` in the JSON response, the frontend evaluated `!t.assigned_developer_name` to `true`, displaying **Unassigned** in the Tasks list table and blindly rendering the **"Find Best Developer →"** button even when a task was assigned or `IN_PROGRESS`.
   - On `/tasks/[id]`, the task detail view checked `task.assignment`, which was `undefined` (because the backend sent `current_assignment`), rendering **"No developer assigned to this task yet"**.

2. **Premature Status Mutation**:
   - When a manager assigned a developer via `POST /api/tasks/{id}/assign`, `assign_task` automatically updated `task.status = TaskStatus.IN_PROGRESS`.
   - This violated the separation of concerns: **Assignment $\neq$ Work Started**. Assigning a developer should move the task status to `ASSIGNED`, while work starting is triggered when the assigned developer begins execution.

3. **Missing Task Execution & Time Tracking**:
   - The platform lacked persisted execution time tracking (`started_at`, `completed_at`, `total_actual_minutes`, `is_timer_running`, `timer_started_at`).
   - Estimated vs actual duration and variance could not be calculated accurately for workload and risk management engines.

---

## 2. Core Architectural Principles: Recommendation $\neq$ Assignment $\neq$ Task Started

To prevent workflow confusion, DevAlign AI clearly distinguishes between three distinct states:

```
[ RECOMMENDATION ]
"The AI Engine suggests Developer Alice as the top candidate (Score: 94.5%)."
       │
       ▼
[ ASSIGNMENT ]
"A Manager officially confirms assignment of the task to Developer Alice."
Status → ASSIGNED
       │
       ▼
[ TASK STARTED / IN_PROGRESS ]
"Developer Alice opens their workspace and starts work on the task."
Status → IN_PROGRESS (Execution timer activates, started_at recorded)
```

- **Recommendation**: Non-binding AI prediction. Does not change task ownership or workload until confirmed.
- **Assignment**: Formal transaction binding a developer to a task. Persisted in `assignments` table with `status = ACTIVE` and updates `task.status = ASSIGNED`.
- **Work Started**: Execution state initiated by the developer. Sets `started_at` timestamp, changes task status to `IN_PROGRESS`, and starts the execution timer.

---

## 3. Complete Task & Assignment Lifecycle

```
          Task Created
               │
               ▼
       UNASSIGNED / TODO
               │
               │ Manager runs "Find Best Developer"
               ▼
     AI Candidate Ranking
               │
               │ Manager selects developer & confirms assignment
               ▼
           ASSIGNED ────── (Task shows Assigned Developer Name across all screens)
               │
               │ Developer clicks "Start Work"
               ▼
          IN_PROGRESS ───► BLOCKED ───► IN_PROGRESS
               │            (Report Blocker)
               │ Developer clicks "Complete Task"
               ▼
           COMPLETED ────── (Records actual hours, updates streak & incentive points)
```

---

## 4. Role-Based Access Control (RBAC) Policy Matrix

| Feature / Screen | ADMIN | MANAGER | DEVELOPER |
| :--- | :---: | :---: | :---: |
| **Create Project** | Yes | Yes | No |
| **Create Task** | Yes | Yes | No |
| **Generate Developer Recommendations** | Yes | Yes | No (403 Forbidden) |
| **Assign Developer** | Yes | Yes | No (403 Forbidden) |
| **Reassign Developer** | Yes | Yes | No (403 Forbidden) |
| **View My Assigned Work** | Yes | Yes | Yes |
| **Start / Pause / Complete Assigned Task** | Yes | Yes | Yes (Only own assigned tasks) |
| **Organization Recommendation Controls** | Yes | Yes | No (Hidden from UI & API) |
| **Research & ML Evaluation Lab** | Yes | No | No |

---

## 5. Single Source of Truth for Assignment Data

- **Database Table**: `assignments` table (`Assignment` model).
- **Active Assignment Rule**: `Assignment.status == AssignmentStatus.ACTIVE`.
- **Task Serialization**:
  - `TaskResponse` schema returns `current_assignment` (active `AssignmentResponse`), `assignment_history` (all past assignments), and convenience flat fields `assigned_developer_id` and `assigned_developer_name`.
  - All consumer pages (`/tasks`, `/tasks/[id]`, `/dashboard`, `/assignments`, `/workload`, `/analytics`) consume `assigned_developer_name` derived from `current_assignment`.

---

## 6. Task Execution & Time Tracking Implementation

- **Persisted Fields on `Task` Model**:
  - `started_at`: Timestamp when developer first starts work.
  - `completed_at`: Timestamp when task is marked complete.
  - `total_actual_minutes`: Total accumulated minutes spent working on task.
  - `is_timer_running`: Boolean state of active timer.
  - `timer_started_at`: Timestamp when current active timer session started.
- **Computed Metrics**:
  - `actual_hours = total_actual_minutes / 60.0`
  - `variance_hours = actual_hours - estimated_hours`
- **Execution API Endpoints**:
  - `POST /api/tasks/{id}/start`: Activates timer, sets status to `IN_PROGRESS`.
  - `POST /api/tasks/{id}/pause`: Pauses timer and accumulates elapsed minutes into `total_actual_minutes`.
  - `POST /api/tasks/{id}/stop`: Stops timer, records `completed_at`, sets status to `COMPLETED`, marks assignment `COMPLETED`, and updates developer streak and incentive rewards.

---

## 7. Viva Answer Guide: Moving from Recommendation to Task Execution

> **Q: How does DevAlign AI move from AI recommendation to actual task execution?**
>
> **Answer:**
> "DevAlign AI separates recommendation, assignment, and execution into three distinct architectural phases:
> 1. **Recommendation**: The baseline/ML engine ranks candidates based on skill coverage, workload, experience, and performance scores, generating a non-binding recommendation.
> 2. **Assignment**: A manager selects a developer and confirms the assignment. This creates an active `Assignment` transaction record in PostgreSQL, invalidates stale recommendation caches, updates workload scores, and transitions the task status to `ASSIGNED`. The assigned developer name is immediately synchronized across the Tasks List, Task Detail, and Developer Workspace.
> 3. **Execution**: When the developer signs into their Developer Workspace (`/dashboard` or `/tasks/[id]`), they see their personal assigned task queue. Clicking **Start Work** transitions the task to `IN_PROGRESS`, records the `started_at` timestamp, and runs a backend-persisted execution timer. Upon completion, the backend calculates total actual hours, computes variance against estimated hours, updates developer streaks and incentive points, and triggers risk and performance intelligence recalculations."
