# DevAlign AI — Viva Feature Inventory & Defense Guide

**Document Version:** 1.0.0  
**Milestone:** 27 — Viva & Academic Review Preparation  
**Date:** September 2026  

---

## 1. Complete Feature Inventory (Verified Implemented)

### A. Core Management & Security
- [x] **Authentication & Role-Based Access Control (RBAC):** JWT authentication with bcrypt password hashing and three role tiers (`ADMIN`, `MANAGER`, `DEVELOPER`).
- [x] **Project Management:** Project creation, status tracking (`ACTIVE`, `COMPLETED`, `ARCHIVED`), deadline tracking, and team assignment.
- [x] **Team Management:** Engineering team creation, lead assignment, and developer membership.
- [x] **Developer Profiles & Skill Matrix:** Experience tracking, availability status (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`), and proficiency scoring per skill (0-100).
- [x] **Task Management:** Task creation, category tagging, priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), complexity (`LOW`, `MEDIUM`, `HIGH`), estimated hours, and deadline tracking.
- [x] **Manual & AI Task Assignment:** Manual assignment workflow with status transitions (`ACTIVE`, `COMPLETED`, `REASSIGNED`).

### B. Recommendation & Intelligence Subsystems
- [x] **Deterministic Task Weighting:** Automated calculation of task weight score (0-100) based on priority, complexity, required hours, and skill depth.
- [x] **Workload Engine & Anti-Monopoly Protection:** Dynamic workload score calculation with standard capacity hours (40h/week), complexity multipliers, availability factors, and anti-monopoly penalty scoring.
- [x] **Baseline-v2 Multi-Objective Engine:** Multi-factor candidate scoring combining Skill Match (30%), Skill Coverage (15%), Workload & Anti-Monopoly (15%), Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%).
- [x] **Explainable AI (XAI) & SHAP-like Explanations:** Directional feature contributions (`POSITIVE`, `NEGATIVE`), exact mathematical breakdown, eligibility filtering, and exclusion reasons.
- [x] **Developer Intelligence Sorting & Filtering:** Whitelisted sorting by Name, Experience, Performance, Workload, Availability, Task Completion, and Productivity.

### C. Risk Assessment Engine
- [x] **Task Risk:** Schedule proximity, assigned developer workload, missing skill coverage, and task complexity.
- [x] **Developer Delivery Risk:** Active task concurrency, workload capacity utilization, performance history, and overdue task count.
- [x] **Project Risk:** Aggregated task risk distribution, timeline schedule progress, top risk drivers, and manager recommended actions.
- [x] **Transparent Explainability:** Deterministic risk level classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with human-readable driver lists.

### D. AI Project Planner
- [x] **Multi-Provider AI Planning:** Provider abstraction with `HeuristicProvider` (offline fallback), `OllamaProvider` (local LLM), and `OpenAIProvider`.
- [x] **Plan Lifecycle:** Draft generation from natural language requirements -> review -> edit -> one-click approval creating real PostgreSQL projects and tasks.

### E. Developer Performance & Incentives
- [x] **Performance Intelligence:** SLA compliance, completion rate %, on-time delivery rate %, and weighted productivity score.
- [x] **Incentive System & Streaks:** Incentive point rewards, consecutive completion streaks, and badge achievement unlocks.

### F. Research & ML Pipeline
- [x] **Synthetic Dataset & Labeling Pipeline:** CSV dataset generator, rule-based labeling, validation suite, and train/test split generator.
- [x] **Isolated ML Benchmarking:** Random Forest and XGBoost model training pipelines, cross-validation metrics export, and SHAP global feature rankings in `research/ml/artifacts/`.

---

## 2. Viva Examination Questions & Technical Defenses

### Q1: Why use `baseline-v2` instead of raw machine learning for production recommendations?
**Defense:** Machine learning models trained on historical assignment data risk learning past biases (e.g. over-assigning top performers). `baseline-v2` provides a deterministic multi-objective optimization model that explicitly enforces anti-monopoly capacity limits, transparent mathematical scoring, and 100% auditable explanations required for enterprise project management.

### Q2: Why separate the research pipeline from the production backend?
**Defense:** Production services require low-latency, deterministic decisions with strict DB transactional consistency. Separating `research/` (offline CSV data generation and ML model training) ensures production runtime stability and allows safe database resets without deleting trained model files (`.joblib`) or research benchmarks.

### Q3: How is developer workload calculated and how does anti-monopoly protection work?
**Defense:** Workload is calculated by weighting estimated task hours by complexity ($Low=1.0, Medium=1.15, High=1.3$) divided by effective capacity hours ($40 \times \text{AvailabilityFactor}$). Anti-monopoly logic penalizes candidates who are already above 80% capacity, giving lower-workload qualified developers a competitive score boost to prevent burnout.

### Q4: Why doesn't the Risk Assessment Engine automatically reassign developers?
**Defense:** DevAlign AI is designed as a **Decision Support System**. Automated reassignment could break human managerial context, sprint boundaries, or external client agreements. The system surfaces risk levels, drivers, and recommended manager actions, keeping the manager in full control.

### Q5: Are Ollama and OpenAI mandatory for running DevAlign AI?
**Defense:** No. DevAlign AI features a multi-provider fallback architecture. The default `AI_PROVIDER=heuristic` generates structured project plans algorithmically without any external LLM server or API key. Ollama and OpenAI are optional enhancements.
