# Milestone 24 — Verification & Testing Guide

This guide details the verification procedures and manual test scenarios for Milestone 24 — AI-Assisted Project Planning, Task Decomposition & Team Capability Analysis.

---

## Required Manual Test Scenarios

### Scenario A — Simple Project Generation
1. Navigate to `/ai-planning`.
3. Select `Granularity: High-Level`, `Project Type: Web Application`.
4. Click **✨ Generate AI Project Plan**.
5. **Verify**:
   - Plan draft is created in `DRAFT` status.
   - Modules identified: `Frontend Setup`, `Page Views`, `Testing & Responsive Design`.
   - Proposed tasks contain title, description, priority, complexity, and estimated hours.

---

### Scenario B — Full Stack Project Generation
1. Fill Wizard with Project Name: `E-Commerce Platform`, Description: `Scalable online storefront with cart, checkout, payments, and product catalog`.
2. Select `Granularity: Detailed`, `Project Type: E-Commerce`.
3. **Verify**:
   - Modules generated: `Authentication`, `Backend API`, `Database Schema`, `Frontend UI`, `Payment Gateway Integration`, `QA & Testing`.
   - Task effort estimates scale appropriately based on detailed granularity.

---

### Scenario C — Skill Gap Detection
1. Create an AI project plan with technical requirements specifying `Kubernetes` and `AWS Cloud Architecture`.
2. Open the plan detail and switch to the **👥 Team Capability** tab.
3. **Verify**:
   - `🔴 Skill Gap` count increments.
   - `Missing Required Skills in Team` highlights `Kubernetes` / `AWS Cloud Architecture`.
   - Tasks requiring unassigned skills are tagged as `SKILL GAP`.

---

### Scenario D — Capacity Risk & Resource Bottleneck Warning
1. Generate multiple tasks requiring `React` or `Python` skills.
2. Ensure active developers in the team currently have existing assigned workload.
3. Open the capability tab.
4. **Verify**:
   - System displays **Potential Resource Bottleneck Warning** (e.g. `React: 8 tasks required, 1 developer available`).
   - Tasks requiring overloaded skills are tagged `🟡 CAPACITY RISK`.

---

### Scenario E — Human Editing & Task Customization
1. Select a proposed task in the plan review view.
2. Click **✏️ Edit**.
3. Change Priority to `CRITICAL`, Complexity to `HIGH`, and Estimated Hours to `24`.
4. Click **Save Changes**.
5. **Verify**:
   - Task updates in UI and database.
   - Status transitions to `EDITED`.

---

### Scenario F — Plan Application & Real Task Creation
1. In the plan review header, click **🚀 Approve & Create Tasks**.
2. If missing skills exist, select resolution action (e.g., `Create Skill` or `Map to Existing`).
3. Click **Confirm & Apply Plan**.
4. **Verify**:
   - Plan status changes to `APPLIED`.
   - Production `Project`, `Task`, and `TaskSkill` records are created inside a single atomic transaction.
   - `Task Weight Engine` runs automatically and populates `task_weight` and `task_weight_category`.

---

### Scenario G — `baseline-v2` Recommendation Querying
1. Navigate to `/projects/{id}` or `/recommendations`.
2. Select a newly created task from the applied AI plan.
3. Click **✨ Find Best Developer**.
4. **Verify**:
   - Active `deterministic_baseline / baseline-v2` engine executes fresh compatibility calculation across the 7 scoring factors.
   - Recommendation results display developer match percentage without automatically assigning developers.

---

## Automated Verification Suite

### Backend Pytest Suite
Run the full test suite from the `backend/` directory:

```powershell
.\venv\Scripts\python.exe -m pytest
```

Expected output: `127 passed`.

### Frontend TypeScript Check
Run the TypeScript compiler check from the `frontend/` directory:

```powershell
npx tsc --noEmit
```

Expected output: `0 ERRORS`.
