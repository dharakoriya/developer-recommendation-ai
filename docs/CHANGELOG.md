# Changelog

All meaningful project changes should be recorded here.

## Format

Each entry should contain:

* Version/date
* Change
* Reason
* Important technical decision

## 2026-08-27 — Milestone 15 — Real-World Dataset Collection, Label Accumulation & Research Monitoring

### Added

* Created SQLAlchemy model `RecommendationDatasetSnapshot` in `backend/app/models/recommendation_snapshot.py` for managing immutable versioned dataset snapshots (`recommendation_dataset_snapshots` table).
* Created Pydantic schemas in `backend/app/schemas/realworld_monitoring.py` for collection monitoring responses, growth points, label quality stats, outcome funnels, dataset diversity metrics, and snapshot requests/responses.
* Created `backend/app/services/realworld_monitoring_service.py` handling data collection monitoring aggregation, dataset growth tracking (`get_dataset_growth`), label quality & anomaly detection (`get_label_quality_monitoring`), outcome lifecycle conversion funnels (`get_outcome_quality_funnel`), representation diversity metrics (`get_dataset_diversity`), and immutable snapshot creation/listing (`create_dataset_snapshot`).
* Added REST API endpoints in `backend/app/api/recommendations.py`: `GET /api/recommendations/research/dataset/monitoring`, `GET /api/recommendations/research/dataset/growth`, `GET /api/recommendations/research/dataset/label-quality`, `GET /api/recommendations/research/dataset/outcomes`, `GET /api/recommendations/research/dataset/diversity`, `GET /api/recommendations/research/dataset/snapshots`, `POST /api/recommendations/research/dataset/snapshots`.
* Implemented automated pytest suite `backend/tests/test_realworld_monitoring.py` covering all 16 requirements (all 91 backend pytest tests passing 100%).
* Implemented Next.js Frontend page `frontend/app/research/dataset/monitoring/page.tsx` with Research Monitoring Header, Data Collection Summary Cards, Outcome Lifecycle Conversion Funnel, Dataset Accumulation Growth visualizer, Label Quality Anomaly Detection panel, Feature Diversity & Concentration warnings, and Immutable Snapshot Manager modal (`npx tsc --noEmit` clean with 0 errors).

### Technical Decisions

* **Immutable Snapshot Enforcement**: Created snapshots cannot be overwritten. Duplicate version requests raise a 400 error.
* **Concentration Anomaly Warnings**: Automatic research warnings trigger if single developer/project accounts for >50% of dataset observations.
* **Production Isolation**: Production recommendation engine remains unchanged as `deterministic_baseline` (`baseline-v1`). No ML models were retrained in Milestone 15.

## 2026-08-27 — Milestone 14 — Real-World Research Dataset Construction, Label Validation & Dataset Quality Analysis

### Added

* Created SQLAlchemy model `RecommendationLabelValidation` in `backend/app/models/recommendation_validation.py` for tracking weak research labels and human ground-truth sign-offs (`VALIDATED_POSITIVE`, `VALIDATED_NEGATIVE`, `REJECTED_LABEL`, `AMBIGUOUS`).
* Extended enums in `backend/app/models/enums.py` (`ValidationStatus`: `UNVALIDATED`, `VALIDATED_POSITIVE`, `VALIDATED_NEGATIVE`, `REJECTED_LABEL`, `AMBIGUOUS`; `ReadinessStatus`: `NOT_READY`, `REVIEW_REQUIRED`, `READY_FOR_EXPERIMENT`; `LabelStatus`: `AMBIGUOUS`).
* Created Pydantic schemas in `backend/app/schemas/realworld_dataset.py` for observation responses, label validation requests, data quality reports, class distributions, synthetic vs. real-world comparison stats, and multi-criteria training readiness assessments.
* Created `backend/app/services/realworld_dataset_service.py` handling unified observation assembly, deterministic weak labeling (`propose_research_label`), human label validation (`validate_observation_label`), automated data quality auditing (`analyze_data_quality`), class distribution calculation, synthetic vs realworld statistical comparison, multi-criteria readiness evaluation, and file exporting.
* Created research exporter script `research/exporters/realworld_exporter.py` generating `realworld-v1` files in `research/dataset/realworld/` (`observations.csv`, `labeled.csv`, `validated.csv`, `dataset_metadata.json`).
* Added REST API endpoints in `backend/app/api/recommendations.py`: `GET /api/recommendations/research/dataset/observations`, `GET /api/recommendations/research/dataset/statistics`, `GET /api/recommendations/research/dataset/quality`, `GET /api/recommendations/research/dataset/labels`, `POST /api/recommendations/research/dataset/labels/{id}/validate`, `GET /api/recommendations/research/dataset/readiness`, `GET /api/recommendations/research/dataset/export`, `GET /api/recommendations/research/dataset/comparison`.
* Implemented automated pytest suite `backend/tests/test_realworld_dataset.py` covering all 17 requirements (all 83 backend pytest tests passing 100%).
* Implemented Next.js Frontend page `frontend/app/research/dataset/page.tsx` with Research Badge Header, Dataset Overview & Multi-Criteria Training Readiness tab, Data Quality & Leakage Audit tab, Synthetic vs Real-World Feature Distribution Comparison tab, and Observational Dataset Inspector with Human Label Validation modal (`npx tsc --noEmit` clean with 0 errors).

### Technical Decisions

* **Strict Temporal Leakage Protection**: Isolated prediction-time feature snapshots captured at recommendation generation time from post-prediction outcome data (`was_assigned`, `completed_at`, `feedback_decision`).
* **Weak Label vs Ground-Truth Distinction**: Rule-derived labels (`WEAK_LABEL`) are explicitly kept separate from human-validated labels (`VALIDATED_LABEL`). Only human-validated labels are included in `validated.csv`.
* **Production Isolation**: Production recommendation engine remains unchanged as `deterministic_baseline` (`baseline-v1`). No ML models were retrained in Milestone 14.

## 2026-08-26 — Milestone 13 — Recommendation Audit Logging, Feedback Loop & ML Model Governance

### Added

* Extended SQLAlchemy database models in `backend/app/models/recommendation_audit.py` creating `RecommendationAudit`, `RecommendationFeedback`, and `RecommendationOutcome`.
* Extended enums in `backend/app/models/enums.py` (`FeedbackDecision`: `ACCEPTED`, `REJECTED`, `IGNORED`, `DEFERRED`; `OutcomeStatus`: `RECOMMENDED`, `ACCEPTED`, `ASSIGNED`, `COMPLETED`; `LabelStatus`: `UNLABELED`, `WEAK_LABEL`, `VALIDATED_LABEL`).
* Implemented `backend/app/services/outcome_dataset_service.py` to handle immutable audit snapshot preservation (`record_recommendation_audit`), human reviewer feedback collection (`submit_recommendation_feedback`), task assignment outcome tracking (`update_assignment_outcome`), and observational dataset preview metrics (`get_observational_dataset_preview`).
* Implemented `backend/app/services/model_governance_service.py` providing `get_model_registry_governance()` tracking provenance for `baseline-v1` (Active Production) and `ml-v1-rf-xgb` (Experimental Research).
* Integrated recommendation audit logging into `generate_and_persist_task_recommendations()` in `backend/app/services/recommendation_service.py`.
* Integrated task assignment outcome tracking into `assign_task()` endpoint in `backend/app/api/assignments.py`.
* Added REST API endpoints in `backend/app/api/recommendations.py`: `POST /api/recommendations/{id}/feedback`, `GET /api/recommendations/{id}/audit`, `GET /api/recommendations/audit`, `GET /api/recommendations/feedback`, `GET /api/recommendations/research/outcomes`, `GET /api/recommendations/research/dataset-preview`, `GET /api/recommendations/research/model-registry`.
* Implemented automated pytest suite `backend/tests/test_recommendation_governance.py` (all 73 backend tests passing 100%).
* Implemented Next.js Frontend page `frontend/app/recommendations/audit/page.tsx` with Model Governance Registry, Recommendation Audits table with JSON feature snapshot viewer modal, Human Feedback Loop form & history, Assignment Outcomes timeline, and Observational Dataset ML Readiness assessment (`npx tsc --noEmit` clean with 0 errors).

### Technical Decisions

* Production Baseline Active: Maintained `deterministic_baseline` (`baseline-v1`) as active production recommendation engine.
* Temporal Leakage Prevention: Preserved feature vectors in `RecommendationAudit.feature_snapshot` at recommendation generation time so post-recommendation outcomes do not pollute input feature snapshots.
* Event Lifecycle Separation: Maintained separate lifecycle records (`RECOMMENDED` ➔ `ACCEPTED` ➔ `ASSIGNED` ➔ `COMPLETED`).
* Real-World Training Threshold: Enforced statutory requirement of at least 200 validated real-world outcomes before real-world ML model training is attempted.

## 2026-08-24 — Milestone 12 — Explainable ML Recommendation Engine — SHAP Analysis & Model Attribution

### Added

* Created research explainability subsystem under `/research/ml/explainability/` (`shap_explainer.py`, `global_explanation.py`, `local_explanation.py`, `feature_importance.py`).
* Implemented SHAP TreeExplainer manager in `/research/ml/explainability/shap_explainer.py` loading pre-trained XGBoost (`xgboost.joblib`) and StandardScaler (`preprocessor.joblib`) without model retraining.
* Implemented global SHAP feature attribution analyzer in `/research/ml/explainability/global_explanation.py` evaluating mean absolute SHAP values $E[|\phi_i|]$ across all 1,500 research dataset samples and exporting machine-readable artifact `research/ml/artifacts/shap_global_importance.json`.
* Implemented candidate-level local SHAP feature attribution in `/research/ml/explainability/local_explanation.py` calculating suitability prediction probability, feature SHAP contributions, positive/negative factor attribution lists, and rank.
* Created read-only backend service in `/backend/app/services/ml_explainability_service.py`.
* Added REST API endpoints `GET /api/recommendations/research/ml/explainability/global` and `GET /api/recommendations/research/ml/explainability/local/{developer_id}/{task_id}` in `/backend/app/api/recommendations.py`.
* Implemented automated pytest test suite in `/backend/tests/test_ml_explainability.py` (68 total backend tests passing 100%).
* Enhanced Next.js Frontend Research ML page at `/frontend/app/research/ml/page.tsx` featuring global SHAP feature importance bar chart, interactive candidate inspector (Project -> Task -> Developer), suitability probability %, positive/negative factors, and SHAP contribution table.
* Documented SHAP game theory, TreeSHAP mechanism, and research limitations in `/research/ml/README.md`.

### Technical Decisions

* Production Isolation Safety: Kept `deterministic_baseline` (`baseline-v1`) active as production recommendation engine. SHAP explainability operates in research mode without modifying baseline-v1 scoring or database state.
* Explanation vs Weighting: Enforced strict separation between SHAP explainability and recommendation scoring; SHAP values are strictly used to explain and visualize model decisions, never as recommendation weights.

---

## 2026-08-24 — Milestone 11 — ML Model Training, Cross-Validation & Model Evaluation

### Added

* Created ML research subsystem in `/research/ml/` (`preprocessing.py`, `train_random_forest.py`, `train_xgboost.py`, `model_selection.py`, `evaluate.py`, `explainability.py`, `pipeline_ml.py`, `artifacts/`).
* Implemented reproducible StandardScaler preprocessing and feature selection in `/research/ml/preprocessing.py` excluding IDs and metadata while selecting 20 numerical/encoded feature attributes. Fitted strictly on `train.csv`.
* Trained Random Forest (`class_weight="balanced"`, `n_estimators=100`) and XGBoost (`scale_pos_weight=37.85`, `n_estimators=100`) classifiers to address severe 2.60% positive label imbalance.
* Implemented 5-Fold Stratified Cross-Validation on `train.csv` reporting Mean $\pm$ Std for Precision, Recall, F1 Score, ROC-AUC, and PR-AUC.
* Implemented probability threshold tuning (0.30 - 0.70) and model selection on `val.csv` selecting optimal threshold `0.30`.
* Implemented isolated test set evaluation on `test.csv` (227 samples, 7 positive, 220 negative) achieving F1 = 1.000, ROC-AUC = 1.000, PR-AUC = 1.000, and 0 False Positives / 0 False Negatives.
* Saved model artifacts in `research/ml/artifacts/` (`random_forest.joblib`, `xgboost.joblib`, `preprocessor.joblib`, `selected_features.json`, `model_metadata.json`, `evaluation_metrics.json`).
* Updated `MLRecommendationModelAdapter` in `/backend/app/services/recommendation_service.py` to support loading trained research model artifacts in research mode while leaving production `BaselineRecommendationModel` (`baseline-v1`) active as default.
* Created REST API endpoint `GET /api/recommendations/research/ml/metrics` in `/backend/app/api/recommendations.py`.
* Implemented automated pytest test suite in `/backend/tests/test_ml_recommendation.py` covering preprocessing, Random Forest & XGBoost CV, validation selection, test evaluation, and adapter loading (64 total backend tests passing 100%).
* Implemented Next.js Frontend Research ML Evaluation Page at `/frontend/app/research/ml/page.tsx` featuring CV summary table, test set confusion matrix, feature importance ranking, and baseline comparison table (labeled `RESEARCH / EXPERIMENTAL`).
* Documented research ML methodology, artifact structure, and production isolation in `/research/ml/README.md`.

### Technical Decisions

* Production Isolation Safety: Kept `deterministic_baseline` (`baseline-v1`) active for production recommendations. ML models are research candidate models evaluated against synthetic ground truth.
* Strict Test Isolation: Kept `test.csv` isolated until final model evaluation. All hyperparameter tuning, scaler fitting, and threshold selection used `train.csv` and `val.csv` only.
* Class Imbalance Handling: Solved severe 2.60% positive label imbalance using cost-sensitive class weighting rather than premature SMOTE oversampling.

---

## 2026-08-21 — Milestone 10 — Research Dataset Generation & Ground-Truth Labeling

### Added

* Established reproducible research dataset pipeline architecture under `/research/` (`generators/`, `labeling/`, `validation/`, `split/`, `dataset/processed/`).
* Created reproducible synthetic candidate pair dataset generator in `/research/generators/synthetic_generator.py` generating realistic, bounded developer profiles and task attributes matching Milestone 8's exact 21+ feature vector specification.
* Implemented multi-dimensional research ground-truth suitability labeling engine in `/research/labeling/ground_truth_labeler.py` (`label_strategy=suitability-v1`, `label_target` $\in \{0, 1\}$) enforcing Skill Coverage $\ge 60\%$, Min Proficiency Gap $\ge -20$, Workload Score $\le 100\%$, and Availability $\neq$ UNAVAILABLE.
* Created dataset schema quality validator in `/research/validation/dataset_validator.py` verifying missing values, range bounds, enum domains, duplicate pair prevention, and positive/negative label counts.
* Implemented stratified dataset splitter in `/research/split/dataset_splitter.py` exporting `full_dataset.csv`, `train.csv` (70%), `val.csv` (15%), `test.csv` (15%), and `dataset_metadata.json` (`dataset_version=synthetic-v1`).
* Created reproducible pipeline execution script in `/research/pipeline.py` (`num_developers=50`, `num_tasks=30`, `seed=42`, total 1,500 candidate feature vectors).
* Implemented research dataset test suite in `/backend/tests/test_research_dataset.py` covering seed reproducibility, ground-truth criteria enforcement, data leakage prevention, data quality validation, zero overlap between stratified splits, and metadata provenance (58 total backend tests passing 100%).
* Created research documentation in `/research/README.md` detailing dataset versioning, labeling strategy, data leakage prevention, and ML training readiness.

### Technical Decisions

* Data Leakage Prevention: Ground-truth target generation depends strictly on raw domain attributes and does NOT consume or copy the Milestone 9 baseline recommendation score or model outputs.
* Production Safety: Production PostgreSQL database and baseline recommendation system (`BaselineRecommendationModel` / `baseline-v1`) remain 100% untouched and fully operational.
* Seed Reproducibility: Dataset generation uses explicit random seeds (`seed=42`). Identical seeds produce identical candidate rows, labels, and train/val/test CSV splits.

---

## 2026-08-19 — Milestone 9 — Recommendation Ranking Engine & Model-Ready Architecture

### Added

* Created Pydantic schemas in `/backend/app/schemas/recommendation.py` (`ModelMetadataResponse`, `RecommendationExplanationResponse`, `RecommendationResponse`, `RecommendationListResponse`).
* Created Recommendation Service in `/backend/app/services/recommendation_service.py` establishing pluggable `RecommendationModel` abstract base class, `BaselineRecommendationModel` (active pre-ML benchmark), `MLRecommendationModelAdapter` stub, candidate ranking algorithm, feature contribution explanation derivation, and PostgreSQL persistence.
* Implemented Recommendation REST API router in `/backend/app/api/recommendations.py` (`GET /api/recommendations/metadata/model`, `GET /api/recommendations/tasks/{task_id}`, `GET /api/recommendations/{id}`, `GET /api/recommendations/{id}/explanations`).
* Registered `recommendations_router` in `/backend/app/main.py`.
* Implemented automated pytest suite in `/backend/tests/test_recommendation_service.py` covering model metadata, candidate ranking ordering (score descending), skill match influence, workload capacity influence, feature contribution sum reproducibility (`sum(contributions) == score`), determinism, persistence in `recommendations` & `recommendation_explanations` tables, and role authorization (53 total backend tests passing 100%).
* Implemented Next.js Frontend Developer Recommendations Page `/frontend/app/recommendations/page.tsx` displaying task candidates ranking cards (#1, #2, #3...), recommendation score badges, model version metadata, and feature contribution breakdown modal.
* Documented exact REST API payloads for Developer Recommendations & Explanations in `docs/API.md`.

### Technical Decisions

* Research Rules Integrity: Maintained `label_target = NULL` as ground-truth labels remain unavailable. Did not fabricate labels, claim supervised accuracy, or invoke external LLM/AI APIs.
* Pluggable Model Architecture: Decoupled recommendation generation behind a clean `RecommendationModel` interface so future supervised models (Milestone 10) can swap in seamlessly without altering API contracts or frontend interfaces.
* 100% Reproducible Explanations: Every candidate recommendation score is mathematically equal to the exact sum of its feature contributions ($C_{\text{skill}} + C_{\text{coverage}} + C_{\text{workload}} + C_{\text{perf}} + C_{\text{exp}} + C_{\text{avail}} = \text{Total Score}$), saved directly in `recommendation_explanations`.

---

## 2026-08-19 — Milestone 8 — Feature Engineering & Recommendation Dataset Preparation

### Added

* Created Pydantic schemas in `/backend/app/schemas/feature.py` (`FeatureMetadataItem`, `CandidateFeatureVector`, `TaskCandidatesResponse`, `DatasetExportResponse`).
* Created Feature Engineering Service in `/backend/app/services/feature_engineering_service.py` extracting 21+ engineered numerical and categorical features for `(Developer, Task)` candidate pair vectors, skill matching metrics (coverage ratio, proficiency gap, min gap, weighted match score), Workload Engine integration, and CSV dataset export.
* Implemented Feature Engineering REST API router in `/backend/app/api/features.py` (`GET /api/features/metadata`, `GET /api/features/tasks/{task_id}/candidates`, `GET /api/features/pair/{developer_id}/{task_id}`, `GET /api/features/dataset/export`, `GET /api/features/dataset/download.csv`).
* Registered `features_router` in `/backend/app/main.py`.
* Implemented automated pytest suite in `/backend/tests/test_feature_engineering.py` covering feature metadata dictionary retrieval, candidate pair vector extraction, skill match calculation, workload integration, candidate generation across developers, determinism, CSV export formatting, and role authorization (49 total backend tests passing 100%).
* Implemented Next.js Frontend Feature Engine Page `/frontend/app/features/page.tsx` featuring feature metadata catalog table, task candidate generator, candidate feature vectors data table, CSV download button, and research disclaimer notices.
* Documented exact REST API payloads for Feature Engineering & Dataset Preparation in `docs/API.md`.

### Technical Decisions

* No Machine Learning Models: Excluded ML models (Random Forest/XGBoost), prediction scoring, and SHAP until Milestone 9+. Focus is strictly on deterministic feature preparation.
* Label Handling Integrity: `label_target` is explicitly set to `null` (None) for unlabelled candidates. Historical assignments are recorded as `is_historically_assigned` (0/1) without assuming assignment history is ground-truth suitability.
* Workload Integration: Workload features consume Milestone 7's `WorkloadService` results directly, preventing calculation conflicts between feature vectors and dashboard views.

---

## 2026-08-19 — Milestone 7 — Workload Calculation & Balancing

### Added

* Created Pydantic schemas in `/backend/app/schemas/workload.py` (`WorkloadSummaryItem`, `WorkloadSummaryResponse`, `DeveloperWorkloadDetailResponse`, `WorkloadRecordResponse`).
* Created Workload Calculation Service in `/backend/app/services/workload_service.py` implementing deterministic workload calculation, complexity weighting, availability factor adjustments, workload status classification (`AVAILABLE`, `BALANCED`, `HIGH`, `OVERLOADED`), and historical snapshot generation.
* Implemented Workload REST API router in `/backend/app/api/workload.py` (`GET /api/workload`, `GET /api/workload/summary`, `GET /api/workload/developers/{id}`, `POST /api/workload/developers/{id}/snapshot`, `GET /api/workload/developers/{id}/history`).
* Registered `workload_router` in `/backend/app/main.py`.
* Implemented automated pytest suite in `/backend/tests/test_workload_api.py` covering zero workload, active task load, complexity multipliers (`LOW: 1.0`, `MEDIUM: 1.15`, `HIGH: 1.3`), capacity adjustments (`AVAILABLE: 40h`, `PARTIAL: 20h`, `UNAVAILABLE: 2h`), historical assignment filtering (excluding `REASSIGNED`, `COMPLETED`, `CANCELLED`), snapshot creation, history retrieval, and role authorization (43 total backend tests passing 100%).
* Implemented Next.js Frontend Workload Engine Page `/frontend/app/workload/page.tsx` displaying system distribution KPIs, developer workload directory with score progress bars and status badges, developer workload breakdown modal, and snapshot action buttons.
* Documented exact REST API payloads for Workload Engine in `docs/API.md`.

### Technical Decisions

* Deterministic Baseline: Workload is calculated purely from active assigned tasks (`status == AssignmentStatus.ACTIVE`) using task estimated hours, complexity weighting, and developer availability status. Excluded all AI/ML models, recommendations, and predictions.
* Assignment Filtering: Historical assignment records (`REASSIGNED`, `COMPLETED`, `CANCELLED`) preserved from Milestone 6 are strictly filtered out from active workload calculations.
* Workload Snapshot Integrity: Reused existing `workload_records` database table created in Milestone 2 to store immutable snapshots without overwriting historical records.

---

## 2026-08-19 — Milestone 6 — Task & Assignment Management

### Added

* Created Pydantic schemas in `/backend/app/schemas/task.py` (`TaskCreate`, `TaskUpdate`, `TaskResponse`, `TaskSkillCreate`, `TaskSkillUpdate`, `TaskSkillResponse`, `AssignmentCreate`, `AssignmentUpdateStatus`, `AssignmentResponse`).
* Implemented Tasks & Task Skills REST API router in `/backend/app/api/tasks.py` (`GET /api/projects/{project_id}/tasks`, `POST /api/projects/{project_id}/tasks`, `GET /api/tasks/{id}`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `GET /api/tasks/{id}/skills`, `POST /api/tasks/{id}/skills`, `PUT /api/tasks/{id}/skills/{skill_id}`, `DELETE /api/tasks/{id}/skills/{skill_id}`).
* Implemented Task Assignments REST API router in `/backend/app/api/assignments.py` (`POST /api/tasks/{id}/assign`, `GET /api/tasks/{id}/assignments`, `GET /api/developers/{developer_id}/assignments`, `PUT /api/assignments/{assignment_id}/status`, `POST /api/assignments/{assignment_id}/complete`, `POST /api/assignments/{assignment_id}/cancel`).
* Registered `tasks_router` and `assignments_router` in `/backend/app/main.py`.
* Implemented automated pytest suite in `/backend/tests/test_tasks_assignments_api.py` covering task CRUD, required skill management, level validation (0..100), duplicate skill rejection, manual developer assignment, non-destructive reassignment history tracking, assignment completion, and role authorization (37 total backend tests passing 100%).
* Enhanced Next.js Frontend UI page `/frontend/app/projects/[id]/page.tsx` with dedicated Tasks tab, task cards, required skills badges, developer assignment dropdown, and expandable Assignment History timeline drawer.
* Documented exact REST API payloads for Tasks, Task Skills, and Assignments in `docs/API.md`.

### Technical Decisions

* Schema & Database Integrity: Reused existing PostgreSQL tables (`tasks`, `task_skills`, `assignments`) and ORM models (`Task`, `TaskSkill`, `Assignment`) created during Milestone 2; no database migration was needed.
* Auditable Non-Destructive History: Reassigning a task automatically marks the previous active `Assignment` record as `REASSIGNED` (`reassigned_at = func.now()`) and inserts a new `ACTIVE` record. Assignment records are strictly preserved for future AI workload and recommendation modeling.
* Role-Based Access Control: `ADMIN` & `MANAGER` roles have full rights to manage tasks, task skills, and assign/reassign developers; `DEVELOPER` users can view tasks/assignments and update their progress.

---

## 2026-08-19 — Milestone 5 — Projects & Teams Management

### Added

* Created Pydantic schemas in `/backend/app/schemas/project.py` (`ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `TeamCreate`, `TeamUpdate`, `TeamResponse`, `TeamMemberAdd`, `TeamMemberResponse`).
* Implemented Projects REST API router in `/backend/app/api/projects.py` (`GET /api/projects`, `POST /api/projects`, `GET /api/projects/{id}`, `PUT /api/projects/{id}`, `DELETE /api/projects/{id}`).
* Implemented Teams & Team Members REST API router in `/backend/app/api/teams.py` (`GET /api/projects/{project_id}/teams`, `POST /api/projects/{project_id}/teams`, `GET /api/teams/{id}`, `PUT /api/teams/{id}`, `DELETE /api/teams/{id}`, `GET /api/teams/{id}/members`, `POST /api/teams/{id}/members`, `DELETE /api/teams/{id}/members/{developer_id}`).
* Registered `projects_router` and `teams_router` in `/backend/app/main.py`.
* Implemented automated pytest suite in `/backend/tests/test_projects_teams_api.py` covering project/team CRUD, role authorization (`ADMIN`, `MANAGER`, `DEVELOPER`), duplicate member prevention, soft removal via `left_at`, and invalid UUID handling (31 total backend tests passing 100%).
* Implemented Next.js Frontend UI pages: Projects Management directory (`/frontend/app/projects/page.tsx`) and Project Detail & Teams Management page (`/frontend/app/projects/[id]/page.tsx`).
* Documented exact REST API payloads for Projects, Teams, and Team Members in `docs/API.md`.

### Technical Decisions

* Schema & Database Integrity: Reused existing PostgreSQL tables (`projects`, `teams`, `team_members`) and ORM models (`Project`, `Team`, `TeamMember`) created during Milestone 2; no extra migrations needed.
* Role-Based Access Control: `ADMIN` & `MANAGER` roles have full rights to manage projects, teams, and team membership; `DEVELOPER` accounts are restricted to viewing projects and teams (HTTP 403 Forbidden on write operations).
* Historical Team Membership: Developer team removals update `left_at = func.now()` to retain historical team membership data in accordance with `docs/DATABASE.md`.

---

## 2026-08-10 — Project Foundation

### Added

* Initial project documentation structure.
* Defined project rules.
* Defined technology stack.
* Defined system architecture.
* Defined initial database design.
* Defined REST API structure.
* Defined feature scope.
* Defined ML architecture.
* Defined development roadmap.

### Technology Decisions

Frontend:

* Next.js
* TypeScript

Backend:

* FastAPI
* Python

Database:

* PostgreSQL

ML:

* scikit-learn
* XGBoost

Explainability:

* SHAP

### Architecture Decision

The system will use a modular monolithic architecture.

The ML engine will remain part of the application backend ecosystem rather than being developed as a separate application.

### Scope Decision

The initial implementation will prioritize:

* Authentication
* Developer management
* Task management
* Dashboard
* ML recommendation
* SHAP explanation
* Workload balancing

The following are intentionally excluded from the initial implementation:

* LLM chatbot
* Autonomous AI agents
* Neural networks
* Real-time model retraining
* Complex MLOps
* Microservices
* Kubernetes
* Paid AI APIs

### Cost Decision

The development stack will use open-source technologies wherever practical.

Target software/development cost:

₹0 before deployment.

---

## 2026-08-11 — Milestone 1 — Project Initialization

### Added

* Initialized Next.js (App Router, React 18, TypeScript) frontend under `/frontend`.
* Initialized FastAPI (Python 3.12, Uvicorn, Pydantic v2) backend under `/backend`.
* Implemented `GET /api/health` REST endpoint returning backend operational status and database connection state.
* Configured SQLAlchemy PostgreSQL database connection logic with environment variable loading via `pydantic-settings`.
* Created environment template files (`.env.example` & `.env.local`) for frontend and backend.
* Implemented dark theme system verification page in Next.js to verify frontend-backend REST communication.
* Created root `.gitignore` to prevent committing secrets, virtual environments, build artifacts, and node_modules.

### Technical Decisions

* Frontend-Backend Communication: Configured CORS middleware on FastAPI allowing requests from Next.js (`http://localhost:3000`).
* Environment Management: Separated secret handling into `.env` files with strict `.env.example` templates; no hardcoded credentials in source code.

---

## 2026-08-14 — Milestone 2 — Database Schema & Migrations

### Added

* Defined 13 SQLAlchemy 2.0 ORM models in `/backend/app/models/` matching the schema in `docs/DATABASE.md`: `users`, `developer_profiles`, `skills`, `developer_skills`, `projects`, `teams`, `team_members`, `tasks`, `task_skills`, `assignments`, `recommendations`, `recommendation_explanations`, `workload_records`.
* Defined PostgreSQL ENUM types (`user_role_enum`, `availability_status_enum`, `project_status_enum`, `task_priority_enum`, `task_complexity_enum`, `task_status_enum`, `assignment_status_enum`, `shap_direction_enum`).
* Added Foreign Keys, Unique Constraints (e.g. `email`, `developer_id + skill_id`, `task_id + skill_id`), Check Constraints (e.g. `proficiency_level 0..100`, `required_level 0..100`, `estimated_hours > 0`), and indexes documented in `docs/DATABASE.md`.
* Configured Alembic migration environment (`backend/alembic.ini`, `backend/alembic/env.py`) and generated initial migration `backend/alembic/versions/001_initial_schema.py`.
* Implemented automated pytest database schema verification suite in `backend/tests/test_database_schema.py` covering table creation, relationships, UUID defaults, unique constraints, and check constraints.

### Technical Decisions

* ORM Architecture: Used SQLAlchemy 2.0 `Mapped` and `mapped_column` with explicit PostgreSQL UUID primary keys (`uuid.uuid4`).
* Assignment History Integrity: Maintained non-destructive `assignments` historical records to support future ML dataset generation and research requirements.

---

## 2026-08-14 — Milestone 3 — Authentication & Role-Based Authorization

### Added

* Implemented secure bcrypt password hashing and verification in `/backend/app/core/security.py`.
* Implemented HS256 JWT access token generation and decoding in `/backend/app/core/security.py`.
* Implemented authentication endpoints (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`).
* Created reusable role-based authorization dependency `require_roles(*allowed_roles)` in `/backend/app/api/deps.py` supporting `ADMIN`, `MANAGER`, and `DEVELOPER` roles with HTTP 403 Forbidden enforcement.
* Implemented automated pytest test suite in `/backend/tests/test_auth.py` covering registration, login, invalid credentials, JWT validation, 401 unauthenticated responses, 403 forbidden responses, and security assertions (no plaintext or password hashes returned).
* Implemented Next.js frontend authentication foundation: `AuthContext` provider (`/frontend/app/context/AuthContext.tsx`), Login page (`/frontend/app/login/page.tsx`), and protected page (`/frontend/app/protected/page.tsx`).
* Documented exact authentication API payload schemas in `docs/API.md`.

### Technical Decisions

* Password Security: Enforced bcrypt password hashing via standard `bcrypt` library; password hashes and raw passwords are excluded from all API responses.
* JWT Expiration & Environment Config: `JWT_SECRET`, `JWT_ALGORITHM`, and `ACCESS_TOKEN_EXPIRE_MINUTES` loaded strictly from environment variables without hardcoded fallback secrets.

---

## 2026-08-14 — Milestone 4 — Developer & Skill Management

### Added

* Created Developer Profile Pydantic schemas in `/backend/app/schemas/developer.py` (`DeveloperCreate`, `DeveloperUpdate`, `DeveloperResponse`).
* Created Skill & DeveloperSkill Pydantic schemas in `/backend/app/schemas/skill.py` (`SkillCreate`, `SkillUpdate`, `SkillResponse`, `DeveloperSkillAssign`, `DeveloperSkillUpdate`, `DeveloperSkillResponse`).
* Implemented Master Skills Catalog REST API in `/backend/app/api/skills.py` (`GET /api/skills`, `POST /api/skills`, `GET /api/skills/{id}`, `PUT /api/skills/{id}`, `DELETE /api/skills/{id}`).
* Implemented Developer Profiles & Skills REST API in `/backend/app/api/developers.py` (`GET /api/developers`, `POST /api/developers`, `GET /api/developers/{id}`, `PUT /api/developers/{id}`, `DELETE /api/developers/{id}`, `GET /api/developers/{id}/skills`, `POST /api/developers/{id}/skills`, `PUT /api/developers/{id}/skills/{skill_id}`, `DELETE /api/developers/{id}/skills/{skill_id}`).
* Implemented automated pytest suite in `/backend/tests/test_developer_skills_api.py` (23 total backend tests passing 100%).
* Implemented Next.js Frontend pages: Skills Catalog (`/frontend/app/skills/page.tsx`), Developers Directory (`/frontend/app/developers/page.tsx`), and Developer Profile & Skills Details (`/frontend/app/developers/[id]/page.tsx`).
* Documented exact REST API payloads for Developers and Skills in `docs/API.md`.

### Technical Decisions

* Data Integrity Constraints: Enforced `0 <= proficiency_level <= 100`, duplicate skill name prevention (HTTP 400), duplicate user profile prevention (HTTP 400), and duplicate developer-skill assignment prevention (HTTP 400).
* Granular Role Authorization: `ADMIN` & `MANAGER` possess full catalog and profile management rights; `DEVELOPER` accounts are restricted to catalog viewing and modifying their own profile skills.

---

## Future Entries

New changes must be added above this section.

Example:

## YYYY-MM-DD — Feature Name

### Added

* ...

### Changed

* ...

### Fixed

* ...

### Technical Decision

* ...

### Reason

* ...
