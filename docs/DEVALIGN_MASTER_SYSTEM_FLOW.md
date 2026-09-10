# DevAlign AI — Master System Architecture & Flow

This document details the end-to-end operational architecture of DevAlign AI, separating production execution from AI Planning and Research ML Lab workflows.

---

## 1. Master Production System Flow

```
                              ┌───────────────────────────┐
                              │      User / Manager       │
                              └─────────────┬─────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │  Frontend Client UI (Next)│
                              └─────────────┬─────────────┘
                                            │ REST / JSON (Bearer JWT)
                                            ▼
                              ┌───────────────────────────┐
                              │   Backend API (FastAPI)   │
                              └─────────────┬─────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
               ▼                            ▼                            ▼
   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
   │ Core Business Logic   │   │ Baseline-v2 Engine    │   │  Risk & Analytics     │
   │ Projects, Teams,      │   │ 7-Factor Compatibility│   │ Task, Dev, Project    │
   │ Developers, Tasks     │   │ Matching & Eligibility│   │ Risk & Performance    │
   └───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │ SQLAlchemy ORM
                                            ▼
                              ┌───────────────────────────┐
                              │ PostgreSQL Database       │
                              └───────────────────────────┘
```

---

## 2. AI Project Planning Workflow

```
   Manager Inputs High-Level Requirements (Project Name, Description, Type, Granularity)
                                            │
                                            ▼
                           Check Configured AI Provider (`AI_PROVIDER`)
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
      `AI_PROVIDER=heuristic`       `AI_PROVIDER=ollama`         `AI_PROVIDER=openai`
               │                            │                            │
               ▼                            ▼                            ▼
    Heuristic Rule-Based        Local Ollama API Endpoint     Cloud OpenAI API Endpoint
    Planner (Deterministic)      (http://localhost:11434)      (https://api.openai.com)
               │                            │ (Fallback on Err)          │ (Fallback on Err)
               └────────────────────────────┴─────────────┬──────────────┘
                                                          │
                                                          ▼
                                            Generated Structured Plan JSON
                                                          │
                                                          ▼
                                            Manager Reviews & Edits Modules/Tasks
                                                          │
                                                          ▼
                                            Approval Creates Real DB Project & Tasks
```

---

## 3. Research & ML Lab Pipeline Flow (Isolated from Production)

```
                            Real-World Production System
                                         │
                                         ▼ (Captures Feature Snapshots)
                       `research_observational_features` (DB)
                                         │
                                         ▼ (Captures Ground-Truth Outcomes)
                          `ground_truth_labels` (DB)
                                         │
                                         ▼ (Export & Split)
                     `research/dataset/processed/*.csv`
                                         │
                                         ▼ (Offline Training Script)
                     `python research/ml/pipeline_ml.py`
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         Random Forest Candidate                   XGBoost Candidate
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         ▼
                     Validation Selection & Test Benchmarking
                                         │
                                         ▼
                     Model Artifacts (.joblib & .json) Saved to
                             `research/ml/artifacts/`
                                         │
                                         ▼
               Displayed in Admin Research Lab (/research/ml)
```
