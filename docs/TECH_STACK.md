# Technology Stack & Tooling Specifications

This document defines the complete software technology stack, library versions, architectural roles, and selection rationale for **Project Dhara**.

---

## 💻 Tech Stack Summary Table

| Domain | Technology / Library | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js | `^18.3.0` | Modern, component-driven UI library for reactive web applications. |
| **Frontend Language** | TypeScript | `^5.4.0` | Type-safety, auto-completion, and bug prevention for complex UI states. |
| **Build System** | Vite | `^5.2.0` | Next-generation fast frontend bundling and HMR development server. |
| **Styling & Design** | Tailwind CSS | `^3.4.0` | Utility-first CSS framework for rapid, responsive UI design. |
| **Iconography** | Lucide React | `^0.350.0` | Sleek, modern SVG icons for developer and task status indicators. |
| **Data Visualization** | Recharts / Chart.js | `^2.12.0` | Interactive rendering of SHAP feature attributions, LIME weights, and workload charts. |
| **Backend Framework** | FastAPI (Python) | `^0.110.0` | Async, high-performance web framework with auto-generated OpenAPI documentation. |
| **Async Server** | Uvicorn | `^0.28.0` | Lightning-fast ASGI server implementation for Python. |
| **Database ORM** | SQLAlchemy | `^2.0.28` | Powerful SQL toolkit and object-relational mapping for Python. |
| **Data Validation** | Pydantic | `^2.6.0` | Strict data validation and settings management using Python type hints. |
| **Relational Database**| PostgreSQL | `^15.0` | Robust SQL database for storing developers, tasks, workloads, and audit logs. |
| **Cache & Queues** | Redis | `^7.2` | In-memory key-value cache for frequent SHAP explanation outputs & session state. |
| **Machine Learning** | Scikit-Learn | `^1.4.0` | Baseline ML models (Random Forest, Decision Trees, Logistic Regression). |
| **Gradient Boosting** | XGBoost | `^2.0.0` | High-performance gradient boosted decision trees for developer suitability ranking. |
| **Explainable AI (XAI)**| SHAP | `^0.45.0` | Game-theoretic feature importance calculation (TreeExplainer, KernelExplainer). |
| **Explainable AI (XAI)**| LIME | `^0.2.0` | Local interpretable model-agnostic explanations for contrastive assignment rules. |
| **Data Manipulation** | Pandas / NumPy | `^2.2.0` | High-performance data structures and numerical operations for feature pipelines. |
| **Testing Suite** | PyTest / Vitest | `^8.0.0` | Automated unit and integration testing frameworks for Backend and Frontend. |

---

## 🛠️ Technological Selection Rationale

### 1. Frontend: React + TypeScript + Tailwind CSS
- **Why React + Vite?**: Fast page load speeds and hot module replacement allow rapid iteration of management dashboards.
- **Why Recharts / Chart.js?**: Explainable AI requires displaying positive and negative feature impacts clearly (e.g., green bars for skill match, red bars for workload load). Recharts integrates seamlessly with React components.

### 2. Backend: FastAPI (Python 3.10+)
- **Why FastAPI?**: Native asynchronous request handling handles ML model inference requests efficiently without blocking standard CRUD API calls. Native integration with Pydantic ensures standard JSON payload contracts.

### 3. AI & Explainability Engine: Python + Scikit-Learn + XGBoost + SHAP + LIME
- **Why XGBoost & Random Forest?**: Developer task assignment datasets feature structured tabular data (skills count, historic task duration, workload percentage, experience level). Tree-based ensemble models perform exceptionally well on tabular datasets.
- **Why SHAP & LIME?**: SHAP provides consistent global feature importance and mathematically grounded Local Additive Feature Attributions. LIME provides accessible human-readable explanations (e.g., *"Developer X was ranked low because work capacity is at 90%"*).

### 4. Database Layer: PostgreSQL + Redis
- **Why PostgreSQL?**: Complex relational queries are required to track developers, task dependencies, historical assignments, and skill mappings. ACID compliance ensures integrity during task status changes.
- **Why Redis?**: SHAP calculation can be computationally expensive. Redis caches computed SHAP attribution matrices for unchanged active task items to ensure sub-100ms UI response times.
