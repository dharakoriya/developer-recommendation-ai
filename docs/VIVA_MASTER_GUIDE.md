# DevAlign AI — Viva Master Defense Guide

This document contains 34 essential questions and answers for Viva examinations, presentations, and technical reviews of DevAlign AI. Each question provides both a **Short Viva Answer** (30 seconds) and a **Detailed Technical Answer**.

---

## 1. Core Architecture & Product Questions

### Q1: What is DevAlign AI?
- **Short Viva Answer**: DevAlign AI is an intelligent developer recommendation, workload balancing, and project intelligence platform for software engineering teams. It transparently matches developers to tasks based on skills, capacity, experience, and performance.
- **Detailed Answer**: DevAlign AI combines deterministic recommendation algorithms (`baseline-v2`), transparent multi-factor workload capacity tracking, risk decision support, performance incentives (streaks, achievements, points), AI project planning (Ollama/OpenAI/Heuristic), and an isolated Research ML Lab (Random Forest, XGBoost, SHAP) into a unified enterprise platform.

### Q2: What problem does DevAlign solve?
- **Short Viva Answer**: It prevents developer burnout, single-developer monopolization, and project delays caused by manual guesswork when assigning tasks in software teams.
- **Detailed Answer**: Manual task assignment leads to overburdening top performers while underutilizing others, ignoring skill gaps, and underestimating task difficulty. DevAlign automates 7-factor compatibility scoring, enforces anti-monopoly penalties, and detects schedule/workload risks before delays happen.

### Q3: What is baseline-v1?
- **Short Viva Answer**: Baseline-v1 is the legacy 6-factor deterministic scoring model preserved for historical auditability and benchmarking.
- **Detailed Answer**: Implemented as `BaselineRecommendationModel` in `recommendation_service.py`, baseline-v1 weighted Skill Match (35%), Coverage (15%), Workload (20%), Performance (15%), Experience (10%), and Availability (5%).

### Q4: What is baseline-v2?
- **Short Viva Answer**: Baseline-v2 is the active production developer recommendation engine combining 7 transparent factors and strict eligibility classifications (`ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, `INELIGIBLE`).
- **Detailed Answer**: Implemented in `task_developer_compatibility_service.py`, baseline-v2 weights Skill Proficiency (30%), Skill Coverage (15%), Workload & Anti-Monopoly Penalty (15%), Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%).

### Q5: Are baseline-v1 and baseline-v2 trained ML models?
- **Short Viva Answer**: No. Both baseline-v1 and baseline-v2 are 100% deterministic mathematical algorithms written in Python. They require no ML training or model artifacts.
- **Detailed Answer**: They execute pure mathematical scoring functions directly on PostgreSQL developer profiles and task specifications. This guarantees sub-millisecond performance, 100% auditability, and zero dependency on model training files.

### Q6: Why did we train Random Forest and XGBoost ML models if baseline-v2 is active in production?
- **Short Viva Answer**: The ML models exist in the Research & ML Lab for offline benchmarking, validation, and explainability research (SHAP), proving whether ML can match or exceed baseline-v2 performance.
- **Detailed Answer**: In production software engineering, deploying unexplainable "black-box" ML models directly can lead to bias, legal liability, and manager distrust. DevAlign uses baseline-v2 for active production decisions while building a parallel research pipeline (`research/ml/`) to train, evaluate, and extract SHAP feature importances on observational datasets for future model promotion.

### Q7: Is the trained ML model useless?
- **Short Viva Answer**: No. It serves as a research benchmark, validates dataset quality, provides global SHAP feature attributions, and represents a candidate model ready for future promotion if ground-truth validation criteria are met.
- **Detailed Answer**: The ML pipeline proves the feasibility of supervised developer matching, enables comparative research metrics (ROC-AUC, PR-AUC), and populates the Research & ML Lab interface for academic and engineering evaluation.

### Q8: What happens if I clear the PostgreSQL database?
- **Short Viva Answer**: Clearing PostgreSQL resets relational operational data (users, projects, tasks), but does NOT delete trained ML model files (`.joblib` in `research/ml/artifacts/`) or local Ollama LLMs.
- **Detailed Answer**: PostgreSQL stores application relational state. Machine learning artifacts reside as physical files on the filesystem. Deleting the DB clears user accounts and tasks, but ML model files remain untouched. Re-running the seed script restores demo operational data.

---

## 2. Ollama & AI Planning Questions

### Q9: What is Ollama in DevAlign AI?
- **Short Viva Answer**: Ollama is an optional local LLM runtime that allows DevAlign to generate AI project plans using open-source models (like Llama3) 100% offline and free of cost.
- **Detailed Answer**: Configured in `app/services/ai_planning_provider.py`, `OllamaPlanningProvider` connects to `http://localhost:11434` to decompose high-level project descriptions into structured modules and tasks.

### Q10: Is Ollama required to run DevAlign AI?
- **Short Viva Answer**: No. DevAlign defaults to a built-in Heuristic Planning Engine that requires no external AI, no installation, and no API key.
- **Detailed Answer**: If Ollama is offline, uninstalled, or missing models, DevAlign's provider factory automatically falls back to `HeuristicPlanningProvider` seamlessly without errors.

---

## 3. RBAC & Governance Questions

### Q11: What is the difference between ADMIN, MANAGER, and DEVELOPER?
- **Short Viva Answer**: ADMIN manages the system and Research Lab; MANAGER runs project delivery, recommendations, and task assignments; DEVELOPER accesses their personal workspace, assigned tasks, workload, and performance incentives.
- **Detailed Answer**: RBAC is enforced strictly at backend FastAPI routes via `require_roles()`. ADMIN has full access including Research & ML Lab and prediction audit logs; MANAGER has full operational access excluding research tools; DEVELOPER is restricted to personal tasks, skills, performance, streaks, and incentives.

---

## 4. Operational & Formula Questions

### Q12: How is Task Weight calculated?
- **Short Viva Answer**: Task Weight (0-100) = 40% Complexity + 25% Priority + 20% Effort (Hours) + 15% Skill Difficulty.

### Q13: How is Workload calculated?
- **Short Viva Answer**: Workload Score (%) = (Total Complexity-Weighted Active Task Hours / Available Capacity Hours) × 100.

### Q14: How does DevAlign prevent developer monopolization?
- **Short Viva Answer**: Baseline-v2 applies an Anti-Monopoly Penalty (-3 pts for workload ≥80%, -2 pts for active tasks ≥3) to protect busy developers from receiving all new assignments.
