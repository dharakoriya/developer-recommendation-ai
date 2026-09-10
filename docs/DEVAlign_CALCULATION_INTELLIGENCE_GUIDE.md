# DevAlign AI — Calculation Intelligence Guide

This guide provides explicit mathematical formulas, normalization ranges, weighting schemas, and exact code locations for every calculation in DevAlign AI.

---

## 1. Task Weight Score (0.0 to 100.0)

Calculated in `backend/app/services/task_weight_service.py`:

```
Task Weight Score = (Complexity × 40%) + (Priority × 25%) + (Effort × 20%) + (Skill Difficulty × 15%)
```

### Component Weights & Formats:
- **Complexity Weight (40%)**:
  - `LOW` = 25.0
  - `MEDIUM` = 50.0
  - `HIGH` = 100.0
- **Priority Weight (25%)**:
  - `LOW` = 25.0
  - `MEDIUM` = 50.0
  - `HIGH` = 75.0
  - `CRITICAL` = 100.0
- **Effort Score (20%)**:
  - `min(100.0, (estimated_hours / 40.0) * 100.0)`
- **Skill Difficulty Score (15%)**:
  - Average required level across assigned task skills (0 to 100). Default = 50.0.

### Weight Category Classification:
- `< 40.0`: `LIGHT`
- `40.0 - 65.0`: `MODERATE`
- `65.0 - 85.0`: `HEAVY`
- `> 85.0`: `CRITICAL`

---

## 2. Workload & Capacity Utilization (0.0% to 999.99%)

Calculated in `backend/app/services/workload_service.py`:

```
Weighted Hours = ∑ (estimated_hours × complexity_multiplier)
Capacity Hours = Standard Capacity (40.0 hrs) × Availability Factor
Workload Score = (Weighted Hours / Capacity Hours) × 100.0
```

### Parameters & Multipliers:
- **Complexity Multipliers**: `LOW` = 1.0, `MEDIUM` = 1.15, `HIGH` = 1.3
- **Availability Factors**: `AVAILABLE` = 1.0, `PARTIAL` = 0.5, `UNAVAILABLE` = 0.05
- **Classifications**:
  - `< 50.0%`: `AVAILABLE` / `HEALTHY`
  - `50.0% - 80.0%`: `BALANCED` / `MODERATE`
  - `80.0% - 100.0%`: `HIGH`
  - `> 100.0%`: `OVERLOADED`

---

## 3. Baseline-v2 Recommendation Compatibility Score (0.0 to 100.0)

Calculated in `backend/app/services/task_developer_compatibility_service.py`:

```
Compatibility Score = (Skill Match × 30%) + (Skill Coverage × 15%) + (Workload & Anti-Monopoly × 15%)
                    + (Availability × 10%) + (Experience × 10%) + (Performance × 10%)
                    + (Task Weight Compatibility × 10%)
```

### Detailed Factor Contributions:
1. **Skill Match (30%)**: `(weighted_skill_match_score / 100) × 30.0`
2. **Skill Coverage (15%)**: `(matching_skills / total_task_skills) × 15.0`
3. **Workload & Anti-Monopoly (15%)**: `max(0, (1 - workload_score/100) × 15.0 - anti_monopoly_penalty)`
   - Penalty = +3.0 if workload ≥ 80%, +2.0 if active tasks ≥ 3.
4. **Availability (10%)**: `AVAILABLE` = 10.0, `PARTIAL` = 5.0, `UNAVAILABLE` = 0.0
5. **Experience (10%)**: `min(5.0, experience_years) / 5.0 × 10.0`
6. **Performance (10%)**: `(performance_score / 100) × 10.0`
7. **Task Weight Compatibility (10%)**: Evaluates developer experience/performance against task weight category (Critical/Heavy/Light).

---

## 4. Performance Metrics Intelligence

Calculated in `backend/app/services/performance_service.py`:

- **Completion Rate (%)**: `(completed_tasks_count / max(1, total_assigned_tasks)) × 100.0`
- **On-Time Delivery Rate (%)**: `(on_time_completed_tasks / max(1, completed_tasks)) × 100.0`
- **Weighted Productivity**: `∑ (completed_task_weight × complexity_factor) / total_assigned_hours`
- **Overall Performance Score (0-100)**: `(completion_rate × 40%) + (on_time_rate × 35%) + (productivity × 25%)`

---

## 5. Developer Streaks, Achievements & Incentives

Calculated in `backend/app/services/performance_service.py` & `backend/app/api/incentives.py`:

- **Streak Counter**: Increments by 1 on every task completed on or before deadline. Resets to 0 if a task is completed late.
- **Incentive Points Formula**:
  ```
  Points = (Task Estimated Hours × 10) + (On-Time Bonus: 50 pts) + (Difficulty Bonus: High/Critical = 100 pts) + (Streak Bonus: streak × 15 pts)
  ```
- **Achievements**:
  - `STREAK_3`: 3 consecutive on-time task completions.
  - `STREAK_5`: 5 consecutive on-time completions.
  - `HEAVY_LIFTER`: Completed 3+ Heavy or Critical weight tasks.
  - `CENTURION`: Earned 1,000+ lifetime incentive points.

---

## 6. Risk Assessment Engine Formulas

Calculated in `backend/app/services/risk_assessment_service.py`:

- **Task Risk Score**: `(Schedule Risk × 35%) + (Workload Risk × 30%) + (Skill Gap Risk × 20%) + (Complexity Risk × 15%)`
- **Project Risk Score**: `(Avg Active Task Risk × 60%) + (Project Schedule Expiry Risk × 40%)`
- **Risk Levels**: `CRITICAL` (≥ 80), `HIGH` (55-79), `MEDIUM` (30-54), `LOW` (< 30).
