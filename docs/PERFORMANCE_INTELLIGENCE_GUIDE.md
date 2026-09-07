# DevAlign AI — Developer Performance Intelligence & Task Weighting Guide

## Overview

Milestone 19 transforms DevAlign AI into an intelligent **Developer Performance & Task Intelligence Platform**. Beyond skill matching and workload balancing, the platform introduces deterministic task weighting, multi-factor developer performance metrics, CodeChef-inspired productivity streaks, professional SaaS achievements, an internal incentive points engine, and candidate filtering.

---

## 1. Task Weighting System

Tasks are assigned a deterministic **Task Weight Score (1 – 100)** calculated using the formula:

$$\text{Task Weight} = \text{Clamp}_{1..100} \left( 0.40 \times \text{Complexity} + 0.35 \times \text{Effort} + 0.25 \times \text{SkillDifficulty} \right)$$

### Components
1. **Complexity Factor (40% Weight)**:
   - `LOW` = 20 pts, `MEDIUM` = 50 pts, `HIGH` = 75 pts, `CRITICAL` = 100 pts
2. **Effort Factor (35% Weight)**:
   - $1–4 \text{ hrs} \to 15 \text{ pts}$ (Low effort)
   - $5–16 \text{ hrs} \to 40 \text{ pts}$ (Medium effort)
   - $17–40 \text{ hrs} \to 75 \text{ pts}$ (High effort)
   - $40+ \text{ hrs} \to 100 \text{ pts}$ (Very high effort)
3. **Skill Requirement Difficulty (25% Weight)**:
   - Evaluates average target proficiency level, required skill count, and count of specialist skills ($\ge 80\%$).

---

## 2. Developer Performance Metrics

Each developer profile computes multi-factor performance metrics:

1. **Task Completion Rate**:
   $$\text{Completion Rate} = \frac{\text{Completed Tasks}}{\text{Total Assigned Tasks}} \times 100\%$$
2. **Weighted Productivity**:
   $$\text{Weighted Productivity} = \sum \left( \text{Task Weight} \times \text{Completion Factor} \right)$$
3. **On-Time Completion Rate**:
   Percentage of completed tasks delivered on or before deadline / estimated duration.
4. **Composite Performance Score (0 – 100)**:
   - Completion Rate: 30%
   - Weighted Productivity: 25%
   - On-Time Delivery: 20%
   - Quality / Skills: 15%
   - Streak / Consistency: 10%

---

## 3. Productivity Streak 🔥 & Achievement System 🏆

- **Qualifying Rule**: A streak increments when completing a task with $\text{Task Weight} \ge 20$.
- **Streak Continuity**:
  - Same calendar day: streak maintained.
  - Next consecutive day: $+1$ day.
  - Gap $> 1$ day: reset to $1$ day.
- **Professional Achievements**:
  - 🔥 `STREAK_3_DAYS`, `STREAK_7_DAYS`, `STREAK_30_DAYS`
  - 🚀 `TASKS_1_COMPLETED`, `TASKS_5_COMPLETED`, `TASKS_10_COMPLETED`
  - 🧠 `HIGH_COMPLEXITY_MASTER`
  - ⚡ `SPEED_DEMON`

---

## 4. Incentive & Bonus Engine 💰

Calculates internal reward points per completed task:
- **Base Points** = $\text{Task Weight} \times 10$
- **Difficulty Bonus** = $+20\%$ of base points if Task Weight $\ge 75$
- **On-Time Bonus** = $+15\%$ of base points if on time
- **Streak Bonus** = $+10\%$ per active streak day (max $+50\%$)

---

## 5. Candidate Filtering & Recommendation Upgrade (`baseline-v1.1`)

Managers can filter candidates during task assignment based on:
- `min_performance_score`
- `min_completion_rate`
- `availability_status`
- `max_workload_score`
- `min_experience_years`
- `min_skill_match_pct`
- `min_streak`

The enhanced model **`baseline-v1.1`** scores candidates across:
- Skill Match: 30%
- Skill Coverage: 15%
- Workload Capacity: 15%
- Performance Score: 15%
- Experience: 10%
- Availability: 5%
- Productivity & Streak: 10%
