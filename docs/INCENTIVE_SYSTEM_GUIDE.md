# DevAlign AI — Incentive & Reward System Guide

## 1. Calculation Formula

Implemented in `backend/app/services/performance_service.py` & `backend/app/api/incentives.py`:

$$\text{Total Points Granted} = \text{Base Points} + \text{On-Time Bonus} + \text{Difficulty Bonus} + \text{Streak Bonus}$$

- **Base Points**: $\text{Task Estimated Hours} \times 10$
- **On-Time Bonus**: $+50 \text{ pts}$ (if completed on or before deadline)
- **Difficulty Bonus**: $+100 \text{ pts}$ (if Task Weight is Heavy or Critical)
- **Streak Bonus**: $\text{Current Streak Counter} \times 15 \text{ pts}$

---

## 2. Streaks & Achievements

- **Streak Counter**: Increments by 1 for each on-time task completion. Resets to 0 if a task is completed late.
- **Achievements Unlocked**:
  - `STREAK_3`: 3 consecutive on-time task completions.
  - `STREAK_5`: 5 consecutive on-time task completions.
  - `HEAVY_LIFTER`: Completed 3+ Heavy or Critical tasks.
  - `CENTURION`: Earned 1,000+ lifetime incentive points.
