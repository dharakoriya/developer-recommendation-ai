# Changelog

All meaningful project changes should be recorded here.

## Format

Each entry should contain:

* Version/date
* Change
* Reason
* Important technical decision

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
