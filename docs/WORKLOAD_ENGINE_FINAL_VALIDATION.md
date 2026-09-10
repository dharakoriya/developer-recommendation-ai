# DevAlign AI — Workload Engine Final Validation

## 1. Workload Calculation Formula & Thresholds

Workload calculation is implemented in `backend/app/services/workload_service.py`:

$$\text{Weighted Hours} = \sum (\text{Task Estimated Hours} \times \text{Complexity Weight})$$
$$\text{Capacity Hours} = 40.0 \times \text{Availability Factor}$$
$$\text{Workload Score (\%)} = \left( \frac{\text{Weighted Hours}}{\text{Capacity Hours}} \right) \times 100.0$$

### Multipliers:
- **Complexity Weights**: Low = 1.0, Medium = 1.15, High = 1.3
- **Availability Factors**: Available = 1.0, Partial = 0.5, Unavailable = 0.05
- **Status Thresholds**:
  - `< 50.0%`: `AVAILABLE` / `HEALTHY`
  - `50.0% - 80.0%`: `BALANCED` / `MODERATE`
  - `80.0% - 100.0%`: `HIGH`
  - `> 100.0%`: `OVERLOADED`

---

## 2. Bug Fix Summary (Workload 500 Error)

- **Issue**: `GET /api/dashboard/workload` failed with `AttributeError: 'WorkloadRecord' object has no attribute 'status_classification'`.
- **Root Cause**: `WorkloadRecord` model stores `workload_score`, but not a `status_classification` attribute.
- **Fix Applied**: Updated `backend/app/api/dashboard.py` line 246 to compute status string via `classify_workload_status(Decimal(str(score)))`.
- **Verification**: Endpoint tested live; returned HTTP 200 OK. Unit tests passed.
