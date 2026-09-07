# Developer Performance Intelligence, Task Weighting, Incentives & Achievement Guide

Welcome to the **DevAlign AI Developer Performance Intelligence & Achievement Guide**. This document explains the formulas, logic, filtering, incentive rules, and RBAC permissions introduced in Milestone 21.

---

## 1. Task Weighting Intelligence Engine

Every task in DevAlign AI is assigned a transparent, deterministic **Task Weight Score (1–100)** calculated automatically when a task is created, updated, or when required skills are modified.

### Task Weight Formula (1–100)

$$\text{Task Weight} = (0.40 \times \text{Complexity}) + (0.25 \times \text{Priority}) + (0.20 \times \text{Effort}) + (0.15 \times \text{Skill Difficulty})$$

#### Sub-Component Scoring Definitions:

1. **Complexity Score (40%)**:
   - `LOW`: 25.0
   - `MEDIUM`: 50.0
   - `HIGH`: 75.0
   - `CRITICAL`: 100.0

2. **Priority Score (25%)**:
   - `LOW`: 25.0
   - `MEDIUM`: 50.0
   - `HIGH`: 75.0
   - `CRITICAL`: 100.0

3. **Estimated Effort Score (20%)**:
   - `1–4 hours`: 20.0 (Low Effort)
   - `5–8 hours`: 40.0 (Moderate Effort)
   - `9–16 hours`: 60.0 (Medium Effort)
   - `17–40 hours`: 80.0 (High Effort)
   - `40+ hours`: 100.0 (Very High Effort)

4. **Skill Requirement Difficulty Score (15%)**:
   - Evaluated from required technical skill count, target proficiency levels, and specialist levels ($\ge 80$).
   - Range: 0.0 to 100.0.

### Task Weight Categories

| Score Range | Category | Description |
| :--- | :--- | :--- |
| **1 – 25** | `LIGHT` | Standard, low-risk, or minor task |
| **26 – 50** | `MODERATE` | Medium difficulty / effort requirement |
| **51 – 75** | `HEAVY` | High-complexity or resource-intensive task |
| **76 – 100** | `CRITICAL` | Mission-critical, extremely complex task |

---

## 2. Developer Performance Intelligence Score

The **Developer Performance Score (0–100)** is computed deterministically from real application data without metric fabrication.

$$\text{Performance Score} = (0.30 \times \text{Completion Rate}) + (0.25 \times \text{On-Time Rate}) + (0.25 \times \text{Weighted Productivity}) + (0.10 \times \text{Workload Reliability}) + (0.10 \times \text{Skill Growth})$$

- **Task Completion Rate (30%)**: $\frac{\text{Completed Tasks}}{\text{Total Assigned Tasks}} \times 100$
- **On-Time Rate (25%)**: $\frac{\text{On-Time Completed Tasks}}{\text{Total Completed Tasks}} \times 100$
- **Weighted Productivity (25%)**: Normalized total sum of completed task weights.
- **Workload Reliability (10%)**: Capacity balance score.
- **Skill Growth & Experience (10%)**: Multiplier based on experience years and total verified skills.

---

## 3. Developer Multi-Attribute Filtering

Managers and Admins can filter developers directly on `/developers` using six key filter parameters:

1. **Performance Tier**: Top Performers ($\ge 85$), High Performers ($70-84$), Average ($50-69$), Needs Improvement ($<50$).
2. **Minimum Completion Rate**: Filtering by $\ge 90\%$, $\ge 75\%$, or $\ge 50\%$.
3. **Availability Status**: `AVAILABLE`, `PARTIAL`, `UNAVAILABLE`.
4. **Skills Filter**: Multi-skill query matching (e.g. Python, React, PostgreSQL).
5. **Experience Range**: `0-1`, `1-3`, `3-5`, `5+` years.
6. **Workload Status**: `underutilized`, `balanced`, `high_workload`, `overloaded`.

---

## 4. Incentive & Bonus System (Immutable Ledger)

Developer incentive points are recorded as **immutable transaction records** (`DeveloperIncentiveLedger`).

### Point Breakdown

- **Base Reward**: Points granted based on Task Weight category:
  - `LIGHT`: 25 pts
  - `MODERATE`: 50 pts
  - `HEAVY`: 75 pts
  - `CRITICAL`: 100 pts
- **On-Time Bonus**: +15% of Base Points if delivered before task deadline.
- **Difficulty Bonus**: +20% of Base Points for `HEAVY` or `CRITICAL` tasks ($\text{Weight} \ge 51$).
- **Streak Bonus**: +10% per consecutive active streak day (up to max +50%).

### Manual Incentive Adjustments (Admin Only)
- Endpoint: `POST /api/performance/incentives/adjust`
- Restrictive RBAC: Strictly requires `UserRole.ADMIN`.
- Records positive or negative adjustment transactions with audit logs.

---

## 5. Developer Activity Streak System

- **Consecutive Active Calendar Days**: Streaks increment when qualifying tasks are completed on consecutive UTC calendar days.
- **Same Calendar Day**: Multiple completions on the same day maintain the active streak without double incrementation.
- **Missed Days**: If a calendar day is missed, `current_streak` resets to 1 upon the next qualifying task completion.

---

## 6. Achievement System Catalog

Achievements are awarded automatically based on real performance activity:

| Achievement Key | Category | Title | Criteria |
| :--- | :--- | :--- | :--- |
| `FIRST_TASK_COMPLETED` | Productivity | 🏆 First Task Completed | 1+ completed tasks |
| `STREAK_3_DAYS` | Consistency | 🔥 3 Day Streak | 3 consecutive active days |
| `STREAK_7_DAYS` | Consistency | 🔥 7 Day Streak | 7 consecutive active days |
| `STREAK_30_DAYS` | Consistency | ⚡ 30 Day Streak | 30 consecutive active days |
| `HEAVY_TASK_SPECIALIST` | Difficulty | 💪 Heavy Task Specialist | 1+ completed task with Weight $\ge 51$ |
| `CRITICAL_TASK_COMPLETED` | Difficulty | 🚀 Critical Task Completed | 1+ completed task with Weight $\ge 76$ |
| `TOP_PERFORMER` | Mastery | ⭐ Top Performer | Performance Score $\ge 85$ |
| `ON_TIME_CHAMPION` | Speed | 🎯 On-Time Champion | 100% on-time rate with $\ge 3$ completed tasks |

---

## 7. Role-Based Access Control (RBAC) Matrix

| Feature / Resource | ADMIN | MANAGER | DEVELOPER |
| :--- | :---: | :---: | :---: |
| View Team Performance Leaderboard | ✅ | ✅ | ❌ (Own profile only) |
| Multi-Attribute Developer Filtering | ✅ | ✅ | ✅ |
| Recalculate Task Weight Scores | ✅ | ✅ | ❌ |
| Manual Incentive Adjustments | ✅ | ❌ | ❌ |
| Personal Performance, Streak & Points | ✅ | ✅ | ✅ (Own profile only) |
