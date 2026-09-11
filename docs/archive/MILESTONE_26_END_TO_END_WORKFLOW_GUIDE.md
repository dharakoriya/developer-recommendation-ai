# Milestone 26 — End-to-End DevAlign Business Workflow & Final Product Validation Guide

This document presents the complete end-to-end business workflow integration guide and architectural validation for **DevAlign AI**.

---

## 1. System Architecture & Component Mapping

DevAlign AI is built on Next.js 14 (App Router) frontend, FastAPI backend, and PostgreSQL database.

### ASCII Architecture Flow Diagram

```
                 +-----------------------------------+
                 |       PROJECT REQUIREMENTS        |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |    AI PROJECT PLANNER (WIZARD)    |
                 +-----------------------------------+
                /                  |                  \
               /                   |                   \
              v                    v                    v
      Heuristic Planner     Ollama (Local AI)    OpenAI (Generative)
              \                    |                   /
               \                   |                  /
                v                  v                 v
                 +-----------------------------------+
                 |    PROPOSED PLAN DRAFT (SLACK)    |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |     HUMAN MANAGER REVIEW & EDIT   |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |  ATOMIC PLAN APPROVAL & CONVERT   |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |  REAL DB: Project, Tasks, Skills  |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |     TASK WEIGHT CALCULATION       |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |  BASELINE-V2 RECOMMENDATION (7F)  |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |   HUMAN MANAGER ASSIGNMENT (NO AI)|
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |   WORKLOAD & CAPACITY RECALC      |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |   TASK LIFECYCLE (TODO->DONE)     |
                 +-----------------------------------+
                  /                |                \
                 /                 |                 \
                v                  v                  v
     PERFORMANCE METRICS    INCENTIVE REWARDS   AUDIT LOG & ANALYTICS
```

---

## 2. Step-by-Step Business Workflow

### STEP 1: Project Creation (Manual vs AI Planning)
Users navigate to `/projects/new` or click "+ Create Project".
- **Option A (Manual)**: Enters project name, description, and status (`ACTIVE`). Immediately creates a `Project` database record.
- **Option B (AI Planning)**: Redirects to `/ai-planning` wizard.

### STEP 2 & 3: AI Planning Draft Generation & Provider Transparency
In `/ai-planning`, managers fill out the 3-step wizard:
1. Basic Info (Name, Description, Business Objectives, Target Users)
2. Requirements (Functional, Technical, Tech Stack, Deadline)
3. Preferences (Project Type, Task Granularity, Team Size)

The planning service invokes an active provider:
- `HeuristicPlanningProvider` (Default local rule-based engine; 100% free, no API key required)
- `OllamaPlanningProvider` (Local LLM instance via `http://localhost:11434`)
- `OpenAIPlanningProvider` (Generative cloud model fallback)

*UI Transparency*: The UI clearly displays provider provenance badges (e.g. `Planned by Rule-Based Heuristic` or `Local Generative AI (Ollama)`). Rule-based output is **never** disguised as LLM-generated.

### STEP 4 & 5: Human Manager Review & Atomic Plan Approval
The plan exists initially as a `DRAFT` in `ai_project_plans` and `ai_project_plan_tasks` tables.
- Managers can edit task titles, complexity, estimated hours, and required skills.
- Managers can exclude unnecessary tasks or add manual tasks.
- Clicking **Approve & Create Production Project** triggers `apply_ai_project_plan_atomically()` inside a single PostgreSQL database transaction.

### STEP 6: Real Database Record Persistence
Upon plan approval, the backend creates:
- `projects` row linked to `ai_project_plans.applied_project_id`
- `tasks` rows for all non-excluded tasks
- `task_skills` rows linking required skills and proficiency levels (auto-resolving missing skill categories in `skills`)

### STEP 7: Task Weight Calculation
The system calculates a Task Weight Score (0–100) using `calculate_task_weight_score()`:
$$\text{TaskWeight} = 0.35 \times \text{Complexity} + 0.30 \times \text{Priority} + 0.20 \times \text{Effort} + 0.15 \times \text{SkillDifficulty}$$
Categories: `LIGHT` (<35), `MODERATE` (35–65), `HEAVY` (>65).

### STEP 8 & 9: Baseline-v2 Developer Recommendation
Navigating to `/recommendations?task_id={id}` invokes `baseline-v2`, the production-grade 7-factor recommendation model:
1. **Skill Match (30%)**: Weighted proficiency of matching required skills.
2. **Skill Coverage (15%)**: Ratio of required skills covered by candidate.
3. **Workload & Anti-Monopoly Capacity (15%)**: Prevents overloading developers currently above 100% capacity.
4. **Availability (10%)**: Encoded status (`AVAILABLE` = 1.0, `PARTIAL` = 0.5, `UNAVAILABLE` = 0.0).
5. **Experience Years (10%)**: Scaled years of experience.
6. **Performance Rating (10%)**: Historical developer performance score.
7. **Task Weight Compatibility (10%)**: Ensures high-weight tasks match experienced/high-performing developers.

Candidates are categorized into: `ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, or `INELIGIBLE` (with explicit human-readable exclusion reasons).

### STEP 10 & 11: Human Manager Assignment (Strict Rule)
> **MANDATORY RULE**: DevAlign AI does **NOT** automatically assign developers.

Recommendations provide explainable rankings, factor breakdowns, and capacity warnings. The manager manually clicks **Assign Developer** to confirm allocation.

### STEP 12: Workload & Capacity Recalculation
Upon assignment:
- An `assignments` record is created.
- The developer's workload is recalculated in `workload_service.py`:
$$\text{WorkloadScore} = \sum \left( \frac{\text{Task Hours} \times \text{Complexity Weight}}{\text{Standard Capacity Hours} \times \text{Availability Factor}} \right) \times 100$$
- If assignment causes workload > 100%, anti-monopoly flags are set and stale recommendations are invalidated.

### STEP 13 & 14: Task Lifecycle & Completion
- Task status transitions from `TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`.
- Setting status to `COMPLETED` records `completed_at` timestamp and triggers performance recalculation.

### STEP 15 & 16: Performance Metrics & Incentives Integration
- `performance_service.py` updates developer performance ratings based on completed task count, on-time delivery ratio, weighted task completions, and streak counters.
- Incentive rewards ledger (`incentive_reward_ledger`) logs base rewards, difficulty bonuses, and on-time delivery multipliers.

### STEP 17 & 18: Recommendation Audit & Real-Time Analytics
- Recommendation generations and manager assignment decisions are logged in `recommendation_audits` for governance.
- `/analytics` pages query PostgreSQL data via FastAPI endpoints to display live project health scores, team capacity, and task completion metrics.

---

## 3. Data Provenance & Tracing

To maintain data integrity without bloated database schemas:
- **Manual Projects**: Created via `/api/projects` endpoint without `applied_project_id`.
- **AI-Planned Projects**: Contain `ai_project_plans.applied_project_id` foreign key pointing to `projects.id`.
- **Seeded Demo Data**: Pre-seeded demo projects and developers contain standard UUIDs documented in `docs/DEMO_DATA.md`.

---

## 4. Role-Based Access Control (RBAC) Summary

| Route / Endpoint | ADMIN | MANAGER | DEVELOPER |
|---|:---:|:---:|:---:|
| `/dashboard` | System Overview | Manager Overview | Personal Workload & Tasks |
| `/projects` & `/teams` | Full Access | Full Access | View Only |
| `/ai-planning` | Full Access | Full Access | Restricted (403) |
| `/recommendations` | Full Access | Full Access | View Only |
| Task Assignment API | Allowed | Allowed | Forbidden (403) |
| Personal Tasks & Incentives | Allowed | Allowed | Full Access |

---

## 5. How to Explain DevAlign AI in a Viva

When presenting DevAlign AI:
1. **Core Value Proposition**: *"DevAlign AI bridges project requirements and developer capacity using AI-assisted planning and deterministic 7-factor recommendation scoring."*
2. **AI Planning Assistant Role**: *"AI Planning acts purely as an assistant. It generates a structured draft of modules, tasks, and skill requirements. The manager reviews, edits, and approves the plan before any real PostgreSQL database records are created."*
3. **Task Weighting & Matching**: *"Tasks are assigned a Task Weight Score (0–100) based on complexity, priority, effort, and skill difficulty. The baseline-v2 recommendation engine matches candidate developers across 7 transparent factors."*
4. **Human-in-the-Loop Mandate**: *"The AI never makes autonomous assignment decisions. The manager retains full authority for final developer assignments."*
5. **Workload & Performance Feedback**: *"Assigning a task updates developer capacity and anti-monopoly metrics in real time. Task completion feeds into performance scores, streak counters, and incentive ledgers."*

---

## 6. Honest Disclosures: What is Implemented vs Research-Only

### Fully Implemented in Production Architecture:
- PostgreSQL database schema with SQLAlchemy models & Alembic migrations.
- FastAPI backend with JWT authentication and role-based access control (`ADMIN`, `MANAGER`, `DEVELOPER`).
- Heuristic Planning Provider, Ollama Local Provider, and OpenAI Provider integration.
- Atomic single-transaction plan approval converting plan drafts to production Project, Task, and TaskSkill records.
- Task Weighting formula and production `baseline-v2` 7-factor recommendation scoring.
- Human manager assignment workflow, workload capacity recalculation, and anti-monopoly checks.
- Completed task performance recalculation, streak counters, and incentive reward ledger.
- Recommendation governance audit logging.
- Next.js 14 frontend with Light/Dark mode persistence (`devalign_theme`).

### Research-Only / Benchmarking Modules:
- **Research ML Models (Random Forest / XGBoost)**: Located under `research/` and `app/services/ml_recommendation_service.py`. These ML models are strictly for academic benchmarking against `baseline-v2` and are **not** used for active production recommendations.
- **External Platform Integrations**: CodeChef / LeetCode API integrations do not exist and are not claimed. Skill scores are stored natively in the PostgreSQL `developer_skills` table.

---

## 7. Demo Walkthrough Scenarios

### Scenario A: AI-Planned Project Creation & Assignment
1. Login as Manager (`manager@devalign.ai`).
2. Navigate to `/projects/new` $\rightarrow$ Select **Option B — Plan Project with AI**.
3. Input project parameters: Name `"E-Commerce Payment Gateway"`, Description `"Build OAuth2 JWT auth, Stripe Webhooks, and CSV Export"`.
4. Click **Generate AI Project Plan** (uses local `HeuristicPlanningProvider`).
5. Review proposed tasks and provider badge (`Planned by Rule-Based Heuristic`).
6. Click **Approve Plan & Create Production Project**.
7. Navigate to `/projects` $\rightarrow$ Verify real project and tasks exist.
8. Click **Find Best Developer** on a task $\rightarrow$ View `baseline-v2` 7-factor score breakdown.
9. Click **Assign Developer** $\rightarrow$ Verify developer workload score increases.
10. Update task status to `COMPLETED` $\rightarrow$ Verify performance analytics update.
