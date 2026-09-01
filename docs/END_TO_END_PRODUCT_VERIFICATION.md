# DevAlign AI — End-to-End Product & Recommendation Lifecycle Guide

## 1. Overview & Connected Workflow
DevAlign AI connects the entire developer recommendation and workload management lifecycle:

$$\text{Project Creation} \rightarrow \text{Team Formation} \rightarrow \text{Task Definition} \rightarrow \text{Recommendation Run} \rightarrow \text{Manager Decision} \rightarrow \text{Assignment} \rightarrow \text{Developer Workspace} \rightarrow \text{Task Completion} \rightarrow \text{Workload Recalculation} \rightarrow \text{Audit Log}$$

---

## 2. Test Account Credentials Matrix

| User Role | Account Email | Password | Primary Workflow Focus |
|---|---|---|---|
| **ADMIN** | `admin@devalign.ai` | `admin123` | Executive System Operations, Audit Logging & Research ML Lab Oversight |
| **MANAGER** | `manager@devalign.ai` | `manager123` | Managed Projects, Team Formation, Task Definition, Recommendation Generation & Assignments |
| **DEVELOPER** | `alice@devalign.ai` | `dev123` | Dedicated Developer Workspace, Assigned Tasks Queue, Workload Capacity %, Skill Proficiencies & Task Completion |

---

## 3. End-to-End Lifecycle Verification Sequence

### Step 1 — Project & Team Creation (Manager/Admin)
1. Login as `manager@devalign.ai` / `manager123`.
2. Navigate to `/projects` and click **+ New Project**. Enter `FinTech Payment Gateway V2`.
3. Toast notification displays: **`✓ Project "FinTech Payment Gateway V2" created successfully!`**
4. Navigate to `/teams` and click **+ Create Team**. Enter `Core Backend Team`.

### Step 2 — Task Definition with Required Skill Parameters
1. Navigate to `/tasks` and click **+ Create Task**.
2. Define task `Implement Async Redis Rate Limiter`:
   - Project: `FinTech Payment Gateway V2`
   - Required Skill: `Python` (Proficiency: `85`)
   - Priority: `HIGH` | Complexity: `HIGH` | Hours: `16`
3. Toast notification displays: **`✓ Task "Implement Async Redis Rate Limiter" created successfully!`**

### Step 3 — Recommendation Generation & Candidate Comparison
1. Navigate to `/recommendations`.
2. Select task `Implement Async Redis Rate Limiter` from the dropdown menu and click **⚡ Find Best Developer**.
3. Observe **🥇 BEST MATCH #1 Candidate Hero Card** (Alice Sharma, Score: `92.4 / 100`).
4. Click **View Full Score Breakdown** to inspect component point contributions:
   - Skill Match (35% Weight)
   - Skill Coverage (15% Weight)
   - Workload Capacity (20% Weight)
   - Performance Rating (15% Weight)
   - Experience Years (10% Weight)
   - Availability Status (5% Weight)

### Step 4 — Manager Assignment Action
1. Click **🟢 Assign Recommended Developer** on Alice Sharma's candidate card.
2. Toast notification displays: **`✓ Task assigned to Alice Sharma!`**
3. Recommendation audit record is saved automatically.

### Step 5 — Developer Workspace & Task Completion
1. Click **Sign Out** in top header.
2. Sign in as `alice@devalign.ai` / `dev123`.
3. Redirected to **Developer Workspace Dashboard**.
4. In **My Assigned Tasks**, observe `Implement Async Redis Rate Limiter`.
5. Click **✓ Mark Complete**.
6. Toast notification displays: **`✓ Task marked completed successfully!`**
7. Task status updates to `COMPLETED`, assignment status updates to `COMPLETED`, and personal workload capacity recalculates automatically.

---

## 4. Recommendation Engine Deterministic Formula (`baseline-v1`)

$$\text{Score} = (S_{\text{skill}} \times 35) + (S_{\text{coverage}} \times 15) + (S_{\text{workload}} \times 20) + (S_{\text{perf}} \times 15) + (S_{\text{exp}} \times 10) + (S_{\text{avail}} \times 5)$$

- Active Production Recommendation Engine: `deterministic_baseline / baseline-v1`
- Research ML Models (Random Forest, XGBoost): **RESEARCH ONLY**
