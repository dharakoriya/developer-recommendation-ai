# DevAlign AI — How DevAlign Thinks (Plain Language Guide)

This document explains the mental model and decision logic of DevAlign AI in plain, non-technical language. Use this guide to explain the system during presentations or Viva examinations.

---

## 1. The Core Purpose: What Problem Does DevAlign Solve?

In modern software companies, engineering managers face a constant dilemma when assigning work:
- Assigning every urgent task to senior "star" developers leads to **burnout, delays, and monopolization**.
- Assigning complex tasks to junior developers without proper skill match leads to **bugs and missed deadlines**.
- Eyeballing capacity in spreadsheets fails to account for **task difficulty, overlapping deadlines, and skill gaps**.

**DevAlign AI solves this by introducing transparent, auditable intelligence for developer workload balancing, task weighting, and developer recommendation.**

---

## 2. DevAlign's Step-by-Step Decision Logic

When a Manager creates or opens a task in DevAlign, the system asks **7 sequential questions**:

```
Step 1: "What does this task require?"
  └─ Identifies required skills (e.g. Python, FastAPI, Payment Gateways) and required proficiency levels.

Step 2: "How difficult and demanding is this task?"
  └─ Calculates Task Weight (0-100) combining Complexity (40%), Priority (25%), Estimated Hours (20%), and Skill Difficulty (15%). Categorizes as Light, Moderate, Heavy, or Critical.

Step 3: "Who has the necessary skills?"
  └─ Scans all active developer profiles to evaluate Skill Proficiency Match and Skill Coverage Ratio.

Step 4: "Who has available capacity right now?"
  └─ Checks current Workload Score (weighted active task hours / available capacity). Applies Anti-Monopoly Penalty if a developer is already holding 3+ tasks or >80% capacity.

Step 5: "Who is available and experienced?"
  └─ Checks developer Availability Status (Available vs Partial vs Unavailable) and Years of Experience.

Step 6: "Is the developer suitable for this specific task weight?"
  └─ Evaluated by Task Weight Compatibility: Ensures Critical tasks go to experienced high-performers while Light tasks go to junior developers.

Step 7: "Is any candidate candidate at risk?"
  └─ Evaluates hard Eligibility Rules (flags Unavailable developers, overloaded developers >100%, or developers missing >50% skills as INELIGIBLE).
```

---

## 3. How DevAlign Evaluates Risk

DevAlign treats risk as **decision support for managers**, not an automated override:

- **Schedule Risk**: Is the deadline less than 2 days away or already overdue?
- **Workload Risk**: Is the assigned developer over 80% or 100% capacity?
- **Skill Gap Risk**: Does the assigned developer lack required skill levels?
- **Complexity Risk**: Is this a Heavy or Critical task with short duration?

DevAlign presents **clear human-readable explanations** (e.g. *"Assigned developer is at 105% capacity with 2 days remaining"*) and recommends concrete manager actions (*"Review developer workload and consider re-balancing"*).

---

## 4. The Separation of Production vs Research AI

```
┌────────────────────────────────────────────────────────────────────────┐
│ Production System (baseline-v2 Engine)                                 │
│  - 100% Deterministic & Transparent                                    │
│  - Immediate math score (0-100) with clear explanation factors         │
│  - Fast, reliable, requires NO training or ML artifacts                │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Isolated Parallel Track
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Research & ML Lab (Random Forest / XGBoost / SHAP)                     │
│  - Offline ML models trained on synthetic datasets                     │
│  - Used to benchmark ML accuracy against baseline-v2                  │
│  - Collects ground-truth outcome labels for future research            │
└────────────────────────────────────────────────────────────────────────┘
```
