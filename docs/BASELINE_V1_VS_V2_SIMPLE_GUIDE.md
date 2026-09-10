# DevAlign AI — Baseline-v1 vs Baseline-v2 Simple Guide

## Executive Summary (The Simple Explanation)

Think of DevAlign AI like a **smart job-matching calculator** for software developers and tasks:

- **Baseline-v1 (Legacy Model)**: The original formula that used 6 fixed factors (Skill Match, Coverage, Workload, Performance, Experience, Availability) to score developers from 0 to 100.
- **Baseline-v2 (Active Production Model Engine 2.0)**: The upgraded, enhanced formula that uses **7 transparent factors** (Skill Proficiency Match, Skill Coverage, Workload Capacity & Anti-Monopoly Penalty, Availability, Relevant Experience, Developer Performance, and Task Weight Compatibility) plus **strict eligibility rules** (ELIGIBLE, CONDITIONALLY_ELIGIBLE, INELIGIBLE).

> **CRITICAL ARCHITECTURAL TRUTH**:
> **Neither baseline-v1 nor baseline-v2 is a trained Machine Learning (ML) model!**
> Both baseline-v1 and baseline-v2 are **100% deterministic mathematical algorithms** written directly in Python code. They do not load any `.joblib` file, do not require training, and do not call Ollama, OpenAI, or external AI services.

---

## Simple Analogy

Imagine a high school admission system:
- **Baseline-v1**: Adds up GPA + Test Score + Attendance = Final Score.
- **Baseline-v2**: Adds up GPA + Test Score + Attendance + Advanced Class Match + Extra-curriculars, **AND** checks hard rules: if a student has failed a prerequisite course, they are immediately flagged as **INELIGIBLE**, no matter how high their total score is.
- **Trained ML Model (Research)**: An experimental AI trained on 10,000 past student files to guess future college graduation rates. (Kept separately in the Research Lab for testing).

---

## Comparison Table: Baseline-v1 vs Baseline-v2

| Feature / Dimension | Baseline-v1 (Legacy) | Baseline-v2 (Active Production) |
| :--- | :--- | :--- |
| **Model Version Tag** | `"baseline-v1"` | `"baseline-v2"` |
| **Model Type** | `"deterministic_baseline"` | `"deterministic_baseline"` |
| **Status in DevAlign** | Historical Audit / Benchmark | **Active Production Engine** |
| **Scoring Range** | 0.0 to 100.0 | 0.0 to 100.0 |
| **Number of Factors** | 6 Factors | **7 Factors** |
| **Skill Match** | 35% Weight | **30% Weight** |
| **Skill Coverage** | 15% Weight | **15% Weight** |
| **Workload & Capacity** | 20% Weight | **15% Weight + Anti-Monopoly Penalty** |
| **Availability** | 5% Weight | **10% Weight** |
| **Experience** | 10% Weight | **10% Weight** |
| **Performance** | 15% Weight | **10% Weight** |
| **Task Weight Compatibility** | Not Included | **10% Weight** (Aligns developer experience with task weight/complexity) |
| **Eligibility Classifications** | `ELIGIBLE` / `INELIGIBLE` | **`ELIGIBLE` / `CONDITIONALLY_ELIGIBLE` / `INELIGIBLE`** |
| **Exclusion Reasons** | Basic Workload & Availability flags | Detailed transparent warning messages (e.g. missing skills, high workload, junior on critical task) |
| **External AI Calls** | None (0) | None (0) |
| **ML Model File Required** | None (No `.joblib`) | None (No `.joblib`) |

---

## Detailed Breakdown of Baseline-v2 Factors (Total = 100 Points)

1. **Skill Proficiency Match (30%)**: Measures how well the developer's proficiency level matches the required skill levels.
2. **Skill Coverage Ratio (15%)**: What percentage of required task skills the developer actually possesses.
3. **Workload & Anti-Monopoly Protection (15%)**: Prefers developers with lower workload. Subtracts penalty points if a developer already holds 3+ active tasks or >80% capacity to prevent single-developer burnout ("monopolization").
4. **Availability Status (10%)**: Full 10 points for `AVAILABLE`, 5 points for `PARTIAL`, 0 points for `UNAVAILABLE`.
5. **Relevant Experience Years (10%)**: Scales developer experience up to 5 years (2 pts/yr).
6. **Developer Performance (10%)**: Scaled from developer's performance score (0-100).
7. **Task Weight Compatibility (10%)**: Evaluates whether a developer's seniority and past performance are suitable for the task's complexity/weight (e.g., placing junior devs on Light tasks, reserving Senior high-performers for Critical tasks).

---

## Eligibility Rules in Baseline-v2

Baseline-v2 enforces hard rules to protect project delivery:

1. **`INELIGIBLE` Triggers**:
   - Developer availability status is `UNAVAILABLE`.
   - Developer skill coverage ratio is `< 50%`.
   - Developer workload score exceeds capacity limit (`> 100%`).
   - *Result*: Developer is excluded from active assignment suggestions with clear exclusion reasons shown to the manager.

2. **`CONDITIONALLY_ELIGIBLE` Triggers**:
   - Skill coverage between 50% and 99%.
   - Workload score between 80% and 100%.
   - Junior/moderate developer candidate for Heavy/Critical weight task.
   - *Result*: Developer remains eligible but displays warning flags (e.g. "⚠ Partial Skill Coverage (67%)").

3. **`ELIGIBLE`**:
   - Developer meets all skill, workload, availability, and task weight criteria cleanly.
