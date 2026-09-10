# DevAlign AI — Database Reset & Model Safety Guide

## 1. Safety Verification & Environment Check

- **Active Database URL**: `postgresql://postgres:postgres@localhost:5432/devalign_db`
- **Target Host**: `localhost` / `127.0.0.1` (Local Development Database).
- **Safety Status**: Safe local development database. Resetting this database does **not** touch production cloud servers or remote environments.

---

## 2. Conceptual Separation: Database Data vs Model Artifacts

```
┌───────────────────────────────────────────────┐
│              DevAlign AI Repository           │
├───────────────────────┬───────────────────────┤
│ PostgreSQL Database   │ Filesystem Storage    │
│  - users              │  - research/ml/       │
│  - projects           │    artifacts/         │
│  - teams              │    - rf.joblib        │
│  - tasks              │    - xgb.joblib       │
│  - assignments        │  - research/dataset/  │
│  - workload_records   │    processed/*.csv    │
│  - recommendations    │  - Local Ollama LLM   │
└───────────────────────┴───────────────────────┘
```

> **CORE TRUTH**: `DATABASE DATA ≠ TRAINED MODEL FILE ≠ DATASET FILE`
> Resetting or dropping PostgreSQL database tables removes relational operational rows. It does **NOT** delete physical `.joblib` model files, CSV datasets, Python source code, or local Ollama LLM models.

---

## 3. Component Impact Matrix During Database Reset

| Component / Layer | Affected by DB Reset? | Survival Status | How to Restore / Re-populate |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Application Tables** | **YES** (Rows deleted) | Tables wiped cleanly | Run `python backend/scripts/seed_demo_data.py` |
| **Trained ML Models (`.joblib`)** | **NO** | 100% Intact in `research/ml/artifacts/` | N/A (Survives DB reset) |
| **Research CSV Datasets** | **NO** | 100% Intact in `research/dataset/processed/` | N/A (Survives DB reset) |
| **Baseline-v2 Recommendation Engine** | **NO** | 100% Operational | Works immediately once new DB data is seeded |
| **Ollama Local LLM Models** | **NO** | 100% Intact in Ollama storage | N/A (Survives DB reset) |
| **Python & TypeScript Source Code** | **NO** | 100% Intact in git repo | N/A (Survives DB reset) |

---

## 4. How to Reset and Restore Clean Test State

To reset the database safely and restore a clean, reproducible demonstration state:

```bash
# Execute safe development seeder
python backend/scripts/seed_demo_data.py
```

This script:
1. Verifies `DATABASE_URL` is pointing to `localhost`.
2. Truncates operational tables in reverse foreign-key dependency order.
3. Seeds 6 test users (Admin, Manager, 4 Developers), 2 projects, 2 teams, 6 core skills, 6 tasks with task weight scores, 3 assignments, streaks, achievements, workloads, and recommendations.
