# DevAlign AI — Recommendation Engine Final Validation

## 1. Active Production Recommendation Engine (`baseline-v2`)

The active recommendation model in DevAlign AI is **`baseline-v2`** (`BaselineV2RecommendationModel` invoking `evaluate_task_developer_compatibility` in `task_developer_compatibility_service.py`).

---

## 2. Realistic Developer Scenario Calculations

### Scenario 1: Candidate Alex (Strong Senior Candidate)
- **Inputs**: Skill Match = 95%, Skill Coverage = 100% (3/3), Workload = 28.75%, Availability = `AVAILABLE`, Experience = 4.5 yrs, Performance = 92/100, Task Weight = 87.75 (`CRITICAL`).
- **Calculation**:
  - Skill Match (30%): $95\% \times 30 = 28.50$ pts
  - Skill Coverage (15%): $100\% \times 15 = 15.00$ pts
  - Workload (15%): $(1 - 0.2875) \times 15 = 10.69$ pts
  - Availability (10%): `AVAILABLE` = 10.00 pts
  - Experience (10%): $(4.5 / 5.0) \times 10 = 9.00$ pts
  - Performance (10%): $(92 / 100) \times 10 = 9.20$ pts
  - Task Weight Compatibility (10%): High performer on Critical task = 10.00 pts
- **Final Score**: **92.39 / 100.0**
- **Eligibility Status**: **`ELIGIBLE`**

---

### Scenario 2: Candidate Rahul (Medium Candidate with High Workload)
- **Inputs**: Skill Match = 80%, Skill Coverage = 67% (2/3), Workload = 85.0%, Availability = `AVAILABLE`, Experience = 3.0 yrs, Performance = 80/100, Task Weight = 60.0 (`MODERATE`).
- **Calculation**:
  - Skill Match (30%): $80\% \times 30 = 24.00$ pts
  - Skill Coverage (15%): $67\% \times 15 = 10.05$ pts
  - Workload (15%): $(1 - 0.85) \times 15 - 3.0 \text{ (monopoly penalty)} = 0.00$ pts
  - Availability (10%): `AVAILABLE` = 10.00 pts
  - Experience (10%): $(3.0 / 5.0) \times 10 = 6.00$ pts
  - Performance (10%): $(80 / 100) \times 10 = 8.00$ pts
  - Task Weight Compatibility (10%): Standard match = 10.00 pts
- **Final Score**: **58.05 / 100.0**
- **Eligibility Status**: **`CONDITIONALLY_ELIGIBLE`** (Warning: Partial Skill Coverage 67%, High Current Workload 85%)

---

### Scenario 3: Candidate David (Ineligible Candidate)
- **Inputs**: Skill Match = 70%, Skill Coverage = 33% (1/3), Workload = 105.0%, Availability = `UNAVAILABLE`.
- **Calculation**: Failed hard eligibility rules.
- **Final Score**: **35.00 / 100.0**
- **Eligibility Status**: **`INELIGIBLE`**
- **Exclusion Reasons**:
  - `❌ Developer Currently Unavailable`
  - `❌ Missing Required Skills (Coverage: 33%)`
  - `❌ Workload Exceeds Capacity Limit (105%)`
