# CLEAN DATABASE TEST SETUP — Environment Preparation Guide

This guide explains how to prepare a clean, deterministic testing environment for DevAlign AI, clarifying data separation across PostgreSQL, filesystem artifacts, ML models, and local LLMs.

---

## 1. Safety & Storage Boundary Protocol

Before executing a database reset, review the storage boundaries:

| Component | Storage Location | Reset Command Impact |
| :--- | :--- | :--- |
| **PostgreSQL Database** | `devalign_db` on port 5432 | **CLEARED & SEEDED**. Drops and recreates operational tables. |
| **Source Code** | `/backend`, `/frontend`, `/research` | **UNTOUCHED**. Git repository files remain unchanged. |
| **Research Datasets** | `research/data/` | **UNTOUCHED**. CSV/JSON dataset files remain on disk. |
| **Trained ML Models** | `research/ml/artifacts/` | **UNTOUCHED**. Scikit-Learn `.joblib` binaries remain intact. |
| **Local Ollama Models** | Local Ollama Daemon | **UNTOUCHED**. GGUF model binaries remain registered. |

---

## 2. Command Sequence for Clean Reset

To reset PostgreSQL to a clean, seeded state:

```bash
# Navigate to backend directory
cd backend

# Execute database reset and demo data seed script
.\venv\Scripts\python.exe scripts/reset_and_seed_test_environment.py
```

---

## 3. Controlled Seed Data Summary

The seed script creates a clean, understandable testing environment:

- **Users (3 Personas)**:
  - `admin@devalign.ai` / `Admin123!` (ADMIN)
  - `manager@devalign.ai` / `Manager123!` (MANAGER)
  - `dev.rahul@devalign.ai` / `Dev123!` (DEVELOPER)
- **Projects**: `DevAlign AI Core Platform`, `Cloud Infrastructure Automation`.
- **Developers**: Rahul Sharma (Senior Fullstack), Priya Patel (Backend Engineer), Aniket Verma (Frontend Specialist).
