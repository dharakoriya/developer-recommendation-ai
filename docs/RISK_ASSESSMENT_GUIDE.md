# DevAlign AI — Risk Assessment Guide

## 1. Multi-Signal Deterministic Risk Architecture

Risk assessment is implemented in `backend/app/services/risk_assessment_service.py` to provide transparent decision support for managers:

```
                            Risk Signals Evaluated
 ┌─────────────────┬──────────────────┬──────────────────┬─────────────────┐
 │  Schedule Risk  │  Workload Risk   │  Skill Gap Risk  │ Complexity Risk │
 └────────┬────────┴────────┬─────────┴────────┬─────────┴────────┬────────┘
          │                 │                  │                  │
          ▼                 ▼                  ▼                  ▼
    (35% Weight)      (30% Weight)       (20% Weight)       (15% Weight)
          │                 │                  │                  │
          └─────────────────┴────────┬─────────┴──────────────────┘
                                     │
                                     ▼
                      Task Overall Risk Score (0-100)
                                     │
                                     ▼
                   Classification: LOW / MEDIUM / HIGH / CRITICAL
```

---

## 2. Risk Level Classifications & Recommended Actions

- `CRITICAL` (≥ 80.0): Urgent action required. Workload or schedule deadline severely compromised.
- `HIGH` (55.0 - 79.9): High priority review. Developer overloaded or tight deadline.
- `MEDIUM` (30.0 - 54.9): Moderate risk. Close monitoring recommended.
- `LOW` (< 30.0): Healthy parameters. On track.
