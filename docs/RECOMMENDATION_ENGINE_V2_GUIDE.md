# Recommendation Engine 2.0 (`baseline-v2`) Architecture & Implementation Guide

## Overview

DevAlign AI's active production recommendation engine has been upgraded to **`baseline-v2`**. This engine delivers intelligent, transparent, deterministic, and explainable developer recommendations without using opaque black-box machine learning models in active decision paths.

Historical `baseline-v1` records remain completely immutable and auditable, while experimental ML models (Random Forest, XGBoost, SHAP) remain strictly isolated as research benchmarks.

---

## 7-Factor Compatibility Scoring System (0 – 100 Points)

`baseline-v2` calculates candidate compatibility using 7 transparent, weighted factors:

| Weight | Factor Name | Description & Formula |
| :--- | :--- | :--- |
| **30%** | **Skill Proficiency Match** | Evaluates candidate skill levels against task required levels: $\text{Match Score} = \min(100, \text{weighted\_skill\_match\_score}) \times 0.30$. |
| **15%** | **Skill Coverage** | Measures ratio of matching required skills: $\text{Coverage Score} = \text{skill\_coverage\_ratio} \times 15.0$. |
| **15%** | **Workload & Anti-Monopoly** | Penalizes candidates with heavy active workloads: If workload $\le 100\%$, $\text{Workload Score} = (1.0 - \text{workload}/100) \times 15.0$; if $>100\%$, $0.0$. |
| **10%** | **Availability** | Rewards full availability: `AVAILABLE` = 10.0, `PARTIAL` = 5.0, `UNAVAILABLE` = 0.0. |
| **10%** | **Experience** | Rewards experience up to 10 years: $\text{Exp Score} = \min(10, \text{exp\_years}) \times 1.0$. |
| **10%** | **Performance** | Incorporates composite performance score: $\text{Perf Score} = (\text{performance\_score} / 100) \times 10.0$. |
| **10%** | **Task Weight Compatibility** | Matches candidate experience/performance to task difficulty category (`LIGHT`, `MODERATE`, `HEAVY`, `CRITICAL`). |

---

## Hard Eligibility Rules & Exclusion Reasons

Candidate recommendations are classified into three hard eligibility states:

1. **`ELIGIBLE`**: Candidate satisfies all skill and availability criteria without high workload risk.
2. **`CONDITIONALLY_ELIGIBLE`**: Candidate meets minimum criteria but triggers warning flags (e.g. partial skill coverage, high workload $\ge 80\%$, or low experience for a `HEAVY`/`CRITICAL` task).
3. **`INELIGIBLE`**: Candidate fails hard eligibility requirements:
   - ❌ Marked as `UNAVAILABLE`
   - ❌ Missing required skills (skill coverage $< 50\%$)
   - ❌ Workload exceeds capacity limit ($> 100\%$)

Ineligible candidates are separated into the **Excluded Candidates** section on the frontend and in API responses (`excluded_recommendations`).

---

## Anti-Monopoly Workload Protection

To avoid overloading top-performing developers ("Best Developer Monopoly"), `baseline-v2` applies a non-linear workload penalty:
- Workload $\le 50\%$: Full workload points awarded (up to +15 pts).
- Workload $50\% - 80\%$: Moderate points awarded (+6 to +12 pts).
- Workload $80\% - 100\%$: Minimal workload points (+0 to +3 pts) and flagged as `CONDITIONALLY_ELIGIBLE`.
- Workload $> 100\%$: $0.0$ workload points and flagged as `INELIGIBLE`.

---

## Automatic Invalidation & Freshness System

To ensure recommendation freshness without unnecessary background computation:
- Recommendation records maintain an `is_stale: bool` flag (default `False`).
- **Triggers**: Modifying tasks (priority, complexity, hours), task skills, developer profiles, developer skills, or assignments marks recommendations for affected tasks as `is_stale = True`.
- **Auto-Regeneration**: Upon fetching recommendations for a task via `GET /api/recommendations/tasks/{id}`, if any record is marked `is_stale = True`, the system automatically re-evaluates candidates using `baseline-v2` and persists updated scores.

---

## Role-Based Access Control (RBAC)

- **`ADMIN` / `MANAGER`**: Full access to generate, view, filter, and audit developer recommendations for all tasks (`200 OK`).
- **`DEVELOPER`**: Strictly forbidden from accessing recommendation endpoints (`403 Forbidden`) to preserve assignment decision integrity.
