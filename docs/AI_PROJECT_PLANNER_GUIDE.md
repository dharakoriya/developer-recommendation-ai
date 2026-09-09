# DevAlign AI — AI Project Planner Architecture & Integration Guide

## Overview

The **AI Project Planner** (Milestone 24) introduces natural language project decomposition, effort estimation, dependency cycle validation, team capability analysis, and automated task weight integration into **DevAlign AI**.

Managers and Admins can input high-level project ideas, functional requirements, technical specifications, and team preferences, and receive an intelligent, structured project plan draft without replacing the human authority over production task creation or developer assignment decisions.

---

## Architecture Flow

```
[PROJECT IDEA / REQUIREMENTS]
              ↓
    [AI PROJECT ANALYSIS]
              ↓
    [MODULE IDENTIFICATION]
              ↓
     [TASK DECOMPOSITION]
              ↓
  [SKILL REQUIREMENT ANALYSIS]
              ↓
 [PRIORITY + COMPLEXITY ESTIMATION]
              ↓
     [EFFORT ESTIMATION]
              ↓
  [TASK DEPENDENCY VALIDATION]
              ↓
   [TEAM CAPABILITY ANALYSIS]
              ↓
     [HUMAN REVIEW / EDIT]
              ↓
        [APPROVE PLAN]
              ↓
     [CREATE REAL TASKS]
              ↓
     [TASK WEIGHT ENGINE]
              ↓
  [baseline-v2 RECOMMENDATIONS]
              ↓
  [HUMAN ASSIGNMENT DECISION]
```

---

## Database Models & Plan Lifecycle

### `AIProjectPlan` (`ai_project_plans`)
- **`id`**: `UUID`
- **`project_name`**: `String(255)`
- **`project_description`**: `Text`
- **`project_type`**: `Enum(WEB_APP, MOBILE_APP, AI_ML_SYSTEM, ENTERPRISE_SOFTWARE, ECOMMERCE, OTHER)`
- **`granularity`**: `Enum(HIGH_LEVEL, BALANCED, DETAILED)`
- **`status`**: `Enum(DRAFT, REVIEWED, APPROVED, REJECTED, APPLIED)`
- **`summary_json`**: `JSONB` (Executive Summary, Modules, Core Value Prop)
- **`planning_input_snapshot`**: `JSONB`
- **`ai_provider`**: `String(50)` (e.g. `mock`, `openai`)
- **`ai_model`**: `String(100)`
- **`prompt_version`**: `String(20)`
- **`created_by`**: `UUID` (User foreign key)

### `AIProjectPlanTask` (`ai_project_plan_tasks`)
- **`id`**: `UUID`
- **`plan_id`**: `UUID` (AIProjectPlan foreign key)
- **`title`**: `String(255)`
- **`description`**: `Text`
- **`module`**: `String(100)`
- **`priority`**: `Enum(LOW, MEDIUM, HIGH, CRITICAL)`
- **`complexity`**: `Enum(LOW, MEDIUM, HIGH, CRITICAL)`
- **`estimated_hours`**: `Numeric(8, 2)`
- **`required_skills`**: `ARRAY(String)`
- **`dependencies`**: `ARRAY(String)` (Task title references)
- **`acceptance_criteria`**: `ARRAY(String)`
- **`status`**: `Enum(PROPOSED, EDITED, APPROVED, EXCLUDED)`
- **`is_manually_added`**: `Boolean`

---

## Provider Architecture & Mock Mode

The system abstracts AI planning providers through the `AIPlanningProvider` base class in `backend/app/services/ai_planning_provider.py`.

### Environment Configuration

```env
AI_PROVIDER=mock       # Options: 'mock' (default), 'openai'
AI_MODEL=gpt-4o-mini   # Applicable if AI_PROVIDER=openai
AI_API_KEY=sk-...      # Applicable if AI_PROVIDER=openai
```

If the external provider is unavailable or returns malformed output, the system fails gracefully with clean validation errors and fallback mock capabilities, ensuring production stability is never compromised.

---

## Team Capability Analysis Engine

The capability analysis engine compares generated task requirements against existing developers, skills, and current workloads:

- **🟢 WELL SUPPORTED**: Required skills exist in org, and qualified developers have available capacity.
- **🟡 CAPACITY RISK**: Required skills exist, but qualified developers currently have high workload scores (> 70).
- **🔴 SKILL GAP**: Required skills do NOT exist among any active developers in the organization.
- **RESOURCE BOTTLENECK WARNING**: Triggered when task demand for a skill exceeds available developer capacity (e.g. 8 React tasks for 1 React developer).

---

## Atomic Plan Application Flow

When an Admin or Manager clicks **🚀 Approve & Create Tasks**:

1. **Skill Resolution Check**: Any skill suggested by AI that doesn't exist in the database can be mapped to an existing skill, created automatically, or removed.
2. **Atomic DB Transaction**: Executes within a single SQLAlchemy transaction (`db.flush()` + `db.commit()`). If any failure occurs, the entire transaction rolls back to prevent orphan projects or partial task creations.
3. **Task Weight Calculation**: Immediately invokes `calculate_task_weight_score()` for each newly created task.
4. **`baseline-v2` Recommendation Integration**: Real tasks are created in `ACTIVE` state, ready for managers to query fresh `baseline-v2` developer recommendations. Developers are **NEVER** automatically assigned.

---

## Security & RBAC Enforcement

- **ADMIN**: Full access to generate, edit, regenerate, and apply AI plans.
- **MANAGER**: Access to generate, edit, regenerate, and apply AI plans.
- **DEVELOPER**: Access forbidden (HTTP 403 Forbidden).
