# Project Roadmap & Execution Plan

This document outlines the **11-Week, 8-Phase** master development roadmap for **Project Dhara**. It specifies key milestones, deliverables, and progress tracking for the AI developer recommendation and workload balancing system.

---

## 🗓️ Master Timeline Overview

```
[Weeks 1-2]   Phase 1: Research & Planning
[Week 3]      Phase 2: Requirements Analysis & System Design
[Week 4]      Phase 3: Data Collection & Feature Pre-processing
[Weeks 5-6]   Phase 4: AI Recommendation Engine Development
[Week 7]      Phase 5: XAI (SHAP/LIME) & Workload Balancing Integration
[Week 8]      Phase 6: Full Stack System Integration (FastAPI + React)
[Week 9]      Phase 7: Empirical Testing, User Study & Validation
[Weeks 10-11] Phase 8: Final Documentation, Dissertation & Defense Prep
```

---

## 📋 Phase Breakdown & Deliverables

### Phase 1: Research & Planning (Weeks 1–2)
- [x] Conduct comprehensive literature review on automated developer recommendation and XAI in SE.
- [x] Identify critical research gaps (lack of explainability, static developer profiles, ignored workload fairness).
- [x] Define research questions (RQ1–RQ4) and establish theoretical framework.
- [x] Finalize project proposal document and repository initialization.

### Phase 2: Requirements Analysis & System Design (Week 3)
- [x] Structure baseline repository architecture (`docs/`, `frontend/`, `backend/`, `ai-engine/`).
- [ ] Define dynamic developer profile data attributes and backlog task schema.
- [ ] Draft REST API endpoints specification (`API.md`).
- [ ] Complete relational database ERD schema design (`DATABASE.md`).

### Phase 3: Data Collection & Pre-processing (Week 4)
- [ ] Extract repository commit histories, issue resolution records, and task metrics.
- [ ] Implement synthetic dataset generator for task-developer historic assignments if offline repository data is required.
- [ ] Clean and transform data: tokenization of task descriptions, TF-IDF / embeddings for required skills.
- [ ] Normalize workload metrics and developer historical performance metrics.

### Phase 4: AI Recommendation Engine Development (Weeks 5–6)
- [ ] Develop machine learning models for developer suitability matching:
  - Random Forest Classifier / Regressor
  - XGBoost Gradient Boosting
  - Neural Network Baseline
- [ ] Evaluate models using Precision, Recall, F1-Score, and Mean Reciprocal Rank (MRR).
- [ ] Hyperparameter tuning and selection of optimal model architecture.

### Phase 5: Explainable AI & Workload Balancing Engine (Week 7)
- [ ] Integrate **SHAP** TreeExplainer / KernelExplainer for global and local feature importance.
- [ ] Integrate **LIME** tabular explainer for individual developer recommendation contrastive explanations.
- [ ] Formulate and implement the Workload Scoring algorithm:
  $$\text{Workload Score} = (\text{Tasks} \times \text{Complexity Weight}) + \text{Estimated Hours} + \text{Deadline Pressure}$$
- [ ] Build automated task redistribution recommendation rules for overloaded developers ($Workload > 80\%$).

### Phase 6: System Implementation & Integration (Week 8)
- [ ] Implement FastAPI backend service endpoints for task management, developer profiles, and recommendations.
- [ ] Build React frontend dashboard:
  - Developer Workload & Capacity Grid
  - Task Backlog Manager & Recommendation Drawer
  - SHAP Waterfall & LIME Feature Importance Visualizer (Recharts/Chart.js)
  - Interactive Task Assignment & Manager Override Controls
- [ ] Connect FastAPI backend with Python AI Engine and PostgreSQL database.

### Phase 7: Testing & Evaluation (Week 9)
- [ ] Conduct performance evaluation comparing automated Dhara recommendations vs manual assignment baselines.
- [ ] Calculate Workload Distribution Variance and Overload Reduction metrics.
- [ ] Conduct User Study (5-point Likert Scale questionnaire with Project Managers, Developers, and Agile Leads) assessing Trust, Explanation Clarity, and System Usability (SUS).

### Phase 8: Documentation & Final Submission (Weeks 10–11)
- [ ] Synthesize empirical evaluation results into research report / dissertation.
- [ ] Update `CHANGELOG.md` and verify all system documentation.
- [ ] Prepare final demonstration video, project slides, and viva examination materials.
