# DevAlign AI — Task Weight Calculation Guide

## 1. Mathematical Formula

Task Weight calculation is implemented in `backend/app/services/task_weight_service.py`:

$$\text{Task Weight Score} = (\text{Complexity} \times 0.40) + (\text{Priority} \times 0.25) + (\text{Effort} \times 0.20) + (\text{Skill Difficulty} \times 0.15)$$

---

## 2. Component Scoring Rules

1. **Complexity Score (40%)**: `LOW` = 25.0, `MEDIUM` = 50.0, `HIGH` = 100.0
2. **Priority Score (25%)**: `LOW` = 25.0, `MEDIUM` = 50.0, `HIGH` = 75.0, `CRITICAL` = 100.0
3. **Effort Score (20%)**: $\min(100.0, (\text{estimated\_hours} / 40.0) \times 100.0)$
4. **Skill Difficulty Score (15%)**: Average required proficiency level of assigned task skills (0-100 scale). Default = 50.0.

---

## 3. Weight Category Thresholds

- `< 40.0`: `LIGHT`
- `40.0 - 65.0`: `MODERATE`
- `65.0 - 85.0`: `HEAVY`
- `> 85.0`: `CRITICAL`
