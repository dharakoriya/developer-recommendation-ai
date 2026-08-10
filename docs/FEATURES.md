# Core Features & Functional Requirements

This document provides a breakdown of all core features and user scenarios supported by **Project Dhara**.

---

## 🚀 Feature Matrix

| Feature Module | Core Functionality | Primary User | Key XAI / AI Component |
| :--- | :--- | :--- | :--- |
| **F1: Dynamic Developer Profiling** | Real-time updating of skill vectors, task history, and availability. | System / Admin | Skill Matrix Normalization |
| **F2: Intelligent Task Matcher** | Ranking developers for backlog tasks based on skill & experience. | Project Manager | XGBoost / Random Forest |
| **F3: SHAP Feature Attributions** | Visual waterfall charts showing game-theoretic feature impacts. | Project Manager | SHAP TreeExplainer |
| **F4: LIME Contrastive Explainer**| Textual natural language explanations for allocation decisions. | Project Manager | LIME Tabular Explainer |
| **F5: Workload Capacity Engine**| Real-time calculation of workload scores and overload alerts. | Scrum Master | Capacity Scoring Algorithm |
| **F6: Fair Task Redistribution** | Automated recommendations for shifting tasks from overloaded devs. | Project Manager | Constraint Optimization |
| **F7: Manager Override Controls** | One-click manual assignment overrides with logging. | Project Manager | Human-in-the-Loop Audit |

---

## 🔍 Feature Specifications

### F1: Dynamic Developer Profiling Engine
- **Description**: Developer skill profiles are continuously updated rather than remaining static.
- **Inputs**: Code commit language ratios, resolved Jira issues, pull request review tags, user self-assessments.
- **Output**: Multi-dimensional skill vector ($0.0 - 1.0$) per developer.

### F2: Intelligent Task & Developer Matching Engine
- **Description**: Evaluates backlog tasks against all active team developers to output ranked suitability recommendations.
- **Inputs**: Task required skills, complexity rating ($1-5$), estimated effort hours, developer skill vectors, historical velocity.
- **Output**: Ranked developer recommendations with suitability confidence scores ($0 - 100\%$).

### F3: Explainable AI (XAI) - SHAP Waterfall Visualizer
- **Description**: Displays explicit SHAP feature contributions for every recommendation card on the dashboard.
- **Visual Representation**: Horizontal bar / waterfall charts where positive factors (green) pull score up, and negative factors (red, e.g., capacity load) pull score down.

### F4: Explainable AI (XAI) - Contrastive LIME Text Explainer
- **Description**: Answers questions like *"Why was Developer A selected over Developer B?"*.
- **Sample Output**: *"Developer A was selected because they hold 95% proficiency in React and have 45% available workload, whereas Developer B has equal skills but is currently at 88% capacity."*

### F5 & F6: Workload Balancing & Automated Redistribution
- **Description**: Monitors team workload variance ($Var(W_i)$). When a developer exceeds the capacity threshold ($W_i > 80\%$), the system generates proactive redistribution suggestions to prevent developer overload and burnout.
- **Redistribution Strategy**: Identifies tasks assigned to overloaded developers that can be reassigned to available developers with minimal skill match decay ($\Delta S < 5\%$).

### F7: Manager Decision Support Interface & Override Control
- **Description**: Interactive Web Dashboard (React + TypeScript) allowing Project Managers to preview recommendations, view XAI charts, adjust sliders, and confirm task allocation with full audit logging.
- **HITL Governance**: Final assignment requires explicit PM action. No automated background assignment occurs without manager consent.
