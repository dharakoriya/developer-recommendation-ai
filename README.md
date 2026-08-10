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

### Prerequisites
- Node.js `v18+` & `npm v9+`
- Python `v3.10+` & `pip`
- PostgreSQL `v15+`

### 1. AI Engine & Backend Setup
```bash
# Navigate to backend/
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI development server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Navigate to frontend/
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

---

## 📜 Research & Documentation

For detailed technical specifications, refer to the documentation in `/docs`:
- 🛠️ [Architecture & Module Design](docs/ARCHITECTURE.md)
- 📊 [Database Schema Specifications](docs/DATABASE.md)
- 🔌 [REST API Definitions](docs/API.md)
- 📌 [System Features Breakdown](docs/FEATURES.md)
- 🗺️ [11-Week Project Roadmap](docs/ROADMAP.md)

---

## 🤝 Ethical AI & Human-Centric Design

Dhara strictly enforces **Human-in-the-Loop (HITL)** governance. The AI engine acts exclusively as a decision-support advisor for Project Managers and Scrum Masters. Final task assignments remain under human control, avoiding automated algorithmic bias, developer skill stagnation, or unfair workload assignments.
