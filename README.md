# Dhara: Explainable AI-Based Developer Recommendation & Workload Balancing System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018-61DAFB.svg)](https://reactjs.org/)
[![XAI Engine](https://img.shields.io/badge/XAI-SHAP%20%7C%20LIME-orange.svg)](https://shap.readthedocs.io/)

**Dhara** is an intelligent decision-support platform engineered to automate developer task assignment in Agile software teams while preserving workload fairness, transparency, and human oversight. By synthesizing machine learning recommendation algorithms with Explainable AI (XAI) techniques (SHAP/LIME) and real-time workload capacity scoring, Dhara addresses the critical trade-offs between prediction accuracy, developer burnout, and decision trust.

---

## 🌟 Key Features

- 👤 **Dynamic Developer Profiling**: Continuously updates developer skill profiles based on commit history, issue completions, code review metrics, and active availability.
- 🎯 **Intelligent Developer Recommendation Engine**: Evaluates task complexity, required technologies, estimated effort, and developer historic affinity to rank candidates for any backlog item.
- 🔍 **Explainable AI (XAI) Attribution**: Integrates **SHAP** (SHapley Additive exPlanations) and **LIME** (Local Interpretable Model-Agnostic Explanations) to provide feature-level transparency (e.g., skill match vs. workload impact) for every recommendation.
- ⚖️ **Workload Balancing & Redistribution**: Computes real-time capacity scores ($Workload = Task\ Count \times Complexity + Hours + Deadline\ Pressure$) and alerts managers to overloaded developers while recommending fair task redistribution.
- 📊 **Manager Decision-Support Dashboard**: An interactive management interface that displays confidence scores, visual XAI breakdowns, and interactive task assignment controls—ensuring final allocation decisions remain in human hands.

---

## 📁 Repository Structure

```
dhara/
│
├── docs/                             # Complete Architecture & System Documentation
│   ├── PROJECT_RULES.md              # Code quality standards, Git workflows & XAI ethics
│   ├── ROADMAP.md                    # 11-Week project execution timeline & milestones
│   ├── TECH_STACK.md                 # Technologies, frameworks & XAI libraries selection
│   ├── ARCHITECTURE.md               # End-to-end system design & component interaction
│   ├── DATABASE.md                   # PostgreSQL schema definitions, ERD & indexing strategies
│   ├── API.md                        # OpenAPI/REST endpoint specifications & payloads
│   ├── FEATURES.md                   # Detailed feature breakdown & functional requirements
│   └── CHANGELOG.md                  # Release notes & version evolution tracking
│
├── frontend/                         # React + TypeScript + Tailwind CSS Management Web Interface
├── backend/                          # FastAPI REST API service for task & developer management
├── ai-engine/                        # Python ML Pipeline (Scikit-Learn/XGBoost, SHAP & LIME)
└── README.md                         # Project main documentation landing page
```

---

## 🏗️ System Architecture

```
                                    +-----------------------+
                                    |    Project Manager    |
                                    +-----------+-----------+
                                                |
                                                v
                                +---------------+---------------+
                                |   Web Application Interface   |
                                +-------+---------------+-------+
                                        |               |
                                        v               v
                        +---------------+--+   +--------+------------------+
                        |  Task Management |   | Developer Profile Engine  |
                        +---------------+--+   +--------+------------------+
                                        |               |
                                        +-------+-------+
                                                |
                                                v
                                +---------------+---------------+
                                |    AI Recommendation Engine   |
                                +-------+---------------+-------+
                                        |               |
                                        v               v
                        +---------------+--+   +--------+------------------+
                        |   XAI Module     |   | Workload Balancing Engine |
                        |  (SHAP / LIME)   |   |   (Capacity & Fairness)   |
                        +---------------+--+   +--------+------------------+
                                        |               |
                                        +-------+-------+
                                                |
                                                v
                                +---------------+---------------+
                                | Recommended Allocation        |
                                | + Visual Feature Explanations |
                                | + Capacity Warnings           |
                                +-------------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts / Chart.js |
| **Backend API** | Python 3.10+, FastAPI, Pydantic, SQLAlchemy 2.0, Uvicorn |
| **AI Engine** | Scikit-Learn, XGBoost, SHAP, LIME, NumPy, Pandas |
| **Database** | PostgreSQL 15+, Redis (caching & task queues) |
| **Tooling & Ops** | Docker, PyTest, Jest, GitHub Actions |

---

## ⚡ Quick Start Guide

For complete, step-by-step setup instructions on a fresh machine, refer to:
👉 **[Complete Local Development Setup Guide](docs/LOCAL_DEVELOPMENT.md)**

### Summary Quick Start (Windows)

```powershell
# 1. Clone repository
git clone https://github.com/your-username/devalign-ai.git
cd devalign-ai

# 2. Setup Backend Virtual Environment & Configuration
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env

# 3. Migrate PostgreSQL Database (Ensure local PostgreSQL server is running on port 5432 & devalign_db exists)
.\venv\Scripts\alembic upgrade head

# 4. Start FastAPI Backend (Terminal 1)
python -m uvicorn app.main:app --reload --port 8000

# 5. Setup & Start Next.js Frontend (Terminal 2)
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🗺️ Milestone Execution Status

- Milestone 1 — Project Initialization ✅
- Milestone 2 — Database Schema & Migrations ✅
- Milestone 3 — Authentication & Role-Based Authorization ✅
- Milestone 4 — Developer & Skill Management ✅
- Milestone 5 — Projects & Teams Management ✅
- Milestone 6 — Tasks & Assignments Management ✅
- Milestone 7 — Workload Calculation & Balancing ✅
- Milestone 8 — Feature Engineering & Recommendation Dataset Preparation ✅
- Milestone 9 — Recommendation Ranking Engine & Model-Ready Architecture ✅
- Milestone 10 — Research Dataset Generation & Ground-Truth Labeling ✅
- Milestone 11 — ML Model Training, Cross-Validation & Model Evaluation ✅
- Milestone 12 — Explainable ML Recommendation Engine — SHAP Analysis & Model Attribution ✅
- Milestone 13 — Recommendation Audit Logging, Feedback Loop & Model Governance ✅
- Milestone 14 — Real-World Research Dataset Construction, Label Validation & Dataset Quality Analysis ✅
- Milestone 15 — Real-World Dataset Collection, Label Accumulation & Research Monitoring ✅

---

## 📜 Research & Documentation

For detailed technical specifications and setup guides, refer to `/docs`:
- 🚀 [Local Development Guide](docs/LOCAL_DEVELOPMENT.md)
- 🛠️ [Architecture & Module Design](docs/ARCHITECTURE.md)
- 📊 [Database Schema Specifications](docs/DATABASE.md)
- 🔌 [REST API Definitions](docs/API.md)
- 📌 [System Features Breakdown](docs/FEATURES.md)
- 🗺️ [11-Week Project Roadmap](docs/ROADMAP.md)
- 📝 [Project Changelog](docs/CHANGELOG.md)


---

## 🤝 Ethical AI & Human-Centric Design

Dhara strictly enforces **Human-in-the-Loop (HITL)** governance. The AI engine acts exclusively as a decision-support advisor for Project Managers and Scrum Masters. Final task assignments remain under human control, avoiding automated algorithmic bias, developer skill stagnation, or unfair workload assignments.
