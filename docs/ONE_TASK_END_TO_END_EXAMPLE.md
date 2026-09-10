# DevAlign AI — One Task End-to-End Walkthrough Example

This document walks a single realistic software engineering task through every calculation, decision, assignment, workload update, risk evaluation, and performance/incentive update in DevAlign AI.

---

## 1. Task Definition & Input Data

- **Task Title**: `"Implement Payment Gateway REST API"`
- **Module**: `Payment & Checkout Integration`
- **Project**: `FinTech SaaS Engine`
- **Estimated Hours**: `20.0 hrs`
- **Complexity**: `HIGH`
- **Priority**: `CRITICAL`
- **Required Skills**: `Python` (req: 80), `FastAPI` (req: 85), `Payment Gateways` (req: 90)

---

## 2. Step 1: Task Weight Calculation

Calculated by `calculate_task_weight_score(task)`:

1. **Complexity Score (40%)**: Complexity `HIGH` = 100.0 → Contribution = `40.0 pts`
2. **Priority Score (25%)**: Priority `CRITICAL` = 100.0 → Contribution = `25.0 pts`
3. **Effort Score (20%)**: `min(100.0, (20.0 / 40.0) * 100.0) = 50.0` → Contribution = `10.0 pts`
4. **Skill Difficulty Score (15%)**: `(80 + 85 + 90) / 3 = 85.0` → Contribution = `12.75 pts`

```
Total Task Weight Score = 40.0 + 25.0 + 10.0 + 12.75 = 87.75 / 100.0
Weight Category = CRITICAL
```

---

## 3. Step 2: Developer Candidate Evaluation (Baseline-v2)

Consider Candidate: **Developer Alex (Senior Backend Engineer)**

- **Experience**: 4.5 Years
- **Performance Score**: 92.0 / 100
- **Availability Status**: `AVAILABLE` (1.0 factor)
- **Current Active Tasks**: 1 task (10 hours)
- **Current Workload Score**: `(10.0 × 1.15) / (40.0 × 1.0) × 100 = 28.75%` (`AVAILABLE`)
- **Skill Proficiencies**: `Python` = 95, `FastAPI` = 90, `Payment Gateways` = 85

### Compatibility Factor Calculation:
1. **Skill Match (30%)**: `88.5% match` → **26.55 pts**
2. **Skill Coverage (15%)**: `3/3 skills matched (100%)` → **15.0 pts**
3. **Workload & Anti-Monopoly (15%)**: `Workload = 28.75% (low)` → **10.69 pts** (No monopoly penalty)
4. **Availability (10%)**: `AVAILABLE` → **10.0 pts**
5. **Experience (10%)**: `4.5 / 5.0 yrs` → **9.0 pts**
6. **Performance (10%)**: `92.0 / 100` → **9.2 pts**
7. **Task Weight Compatibility (10%)**: High performer on Critical task → **10.0 pts**

```
Final Compatibility Score = 26.55 + 15.0 + 10.69 + 10.0 + 9.0 + 9.2 + 10.0 = 90.44 / 100.0
Eligibility Status = ELIGIBLE
Rank = #1 Recommendation
```

---

## 4. Step 3: Assignment & Workload Recalculation

Manager accepts recommendation #1 and assigns task to Alex.

- **Alex's New Active Task Count**: 2 tasks (30 hours total)
- **New Weighted Hours**: `(10.0 × 1.15) + (20.0 × 1.30) = 11.5 + 26.0 = 37.5 weighted hrs`
- **New Workload Score**: `(37.5 / 40.0) × 100.0 = 93.75%`
- **Workload Classification**: `HIGH`

---

## 5. Step 4: Risk Assessment

Evaluated by `assess_task_risk(task_id)`:

- **Schedule Risk**: 15.0 (Deadline is 10 days away)
- **Workload Risk**: 65.0 (Assigned developer is at 93.75% workload)
- **Skill Gap Risk**: 10.0 (High skill match)
- **Complexity Risk**: 75.0 (Critical weight task)

```
Overall Task Risk Score = (15 × 0.35) + (65 × 0.30) + (10 × 0.20) + (75 × 0.15) = 38.0 / 100.0
Risk Level = MEDIUM
Recommended Action: "Monitor task progress closely and verify prerequisite deliverables."
```

---

## 6. Step 5: Task Completion, Performance & Incentive Update

Alex completes the payment gateway API task 2 days before the deadline.

1. **Status**: Changed to `COMPLETED`.
2. **Alex's Workload Score**: Drops back to 28.75%.
3. **On-Time Rate**: 100.0%.
4. **Streak Update**: Increases from 4 → **5 consecutive on-time tasks**.
5. **Incentive Points Calculation**:
   - Base Points: `20.0 hrs × 10 = 200 pts`
   - On-Time Bonus: `+50 pts`
   - Difficulty Bonus (Critical task): `+100 pts`
   - Streak Bonus (5 streak × 15): `+75 pts`
   - **Total Points Granted**: **425 Incentive Points**
6. **Achievement Unlocked**: `STREAK_5` ("5-In-A-Row On-Time Delivery Specialist") unlocked and logged in ledger!
