# DevAlign AI — Performance Engine Guide

## 1. Overview & Key Metrics

Developer performance intelligence is implemented in `backend/app/services/performance_service.py`:

- **Completion Rate (%)**: $(\text{Completed Tasks} / \max(1, \text{Total Assigned Tasks})) \times 100.0$
- **On-Time Delivery Rate (%)**: $(\text{On-Time Completed Tasks} / \max(1, \text{Total Completed Tasks})) \times 100.0$
- **Weighted Productivity Score**: Normalized measure of task weight points delivered per active hour.
- **Overall Performance Score (0-100)**:
  $$\text{Performance Score} = (\text{Completion Rate} \times 0.40) + (\text{On-Time Rate} \times 0.35) + (\text{Productivity Score} \times 0.25)$$

---

## 2. Dynamic Performance Tiering

- `85.0 - 100.0`: Top Performers
- `70.0 - 84.9`: High Performers
- `50.0 - 69.9`: Average Performers
- `< 50.0`: Needs Improvement
