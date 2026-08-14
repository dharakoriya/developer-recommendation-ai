# Changelog

All meaningful project changes should be recorded here.

## Format

Each entry should contain:

* Version/date
* Change
* Reason
* Important technical decision

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
