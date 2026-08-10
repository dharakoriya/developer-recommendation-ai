# Project Rules

## 1. Project Identity

Project: Explainable AI-Based Developer Recommendation and Workload Balancing System

Primary purpose:

Build a decision-support system that recommends suitable developers for software development tasks, explains the recommendations, analyses workload, and suggests fair workload redistribution.

The system assists project managers. It does not automatically make the final task assignment decision.

## 2. Source of Truth

The project proposal and the documents inside `/docs` define the intended system.

Before making architectural or implementation changes:

1. Read `PROJECT_RULES.md`.
2. Read the relevant documentation.
3. Inspect the existing implementation.
4. Do not assume missing requirements.
5. If a proposed change conflicts with an existing documented decision, stop and report the conflict before implementing it.

The codebase must not become the only source of project requirements.

## 3. Technology Decisions

Frontend:

* Next.js
* TypeScript

Backend:

* Python
* FastAPI

Database:

* PostgreSQL

Machine Learning:

* Python
* scikit-learn
* XGBoost

Explainable AI:

* SHAP

Charts/visualisation:

* Chart.js or an equivalent lightweight frontend charting solution.

Do not introduce additional technologies unless there is a clear technical reason.

## 4. Architecture Rules

The application uses a modular monolithic architecture.

Frontend communicates with the backend through REST APIs.

Frontend must not directly access PostgreSQL.

ML functionality must be accessed through the backend/service layer.

Do not create unnecessary microservices.

Do not create a separate AI frontend.

Do not introduce Kubernetes, message queues, Redis, or other infrastructure unless a documented requirement makes them necessary.

## 5. AI Rules

The ML system is a recommendation system, not an autonomous decision maker.

The system must produce ranked recommendations rather than silently assigning tasks.

The final assignment remains under human control.

ML models must use documented input features.

ML predictions must be reproducible when the same model and input data are used.

The deployed recommendation model must be versioned.

The model must not use protected or irrelevant personal attributes for recommendation decisions.

## 6. Explainability Rules

Every AI recommendation should be explainable.

SHAP is the primary explainability mechanism.

Explanations should be presented in understandable terms such as:

* Skill match
* Relevant experience
* Previous similar tasks
* Availability
* Current workload
* Task complexity

Do not display raw technical model output to users when a human-readable explanation can be provided.

## 7. Workload Rules

Developer workload must be considered during recommendation.

A highly skilled developer should not automatically receive every task.

The system should consider:

* Current assigned work
* Estimated task effort
* Task complexity
* Availability
* Deadline pressure
* Skill suitability

The workload system provides suggestions. Final redistribution remains a human decision.

## 8. Coding Rules

Prefer simple and maintainable code.

Avoid unnecessary abstraction.

Avoid duplicated business logic.

Use reusable components where appropriate.

Use strong typing in TypeScript.

Validate API input.

Do not expose secrets or credentials in source code.

Use environment variables for configuration and secrets.

Do not modify unrelated modules while implementing a feature.

Do not remove existing functionality unless explicitly required.

## 9. Database Rules

Use PostgreSQL as the single application database.

Use migrations for schema changes.

Do not manually modify production database schemas without a corresponding migration.

Use foreign keys and appropriate constraints.

Do not store passwords in plain text.

## 10. API Rules

Use REST APIs.

Use appropriate HTTP methods and status codes.

Validate request data.

Return predictable response structures.

Do not expose internal exceptions or stack traces to users.

Authentication and authorization must be enforced on protected endpoints.

## 11. Frontend Rules

The frontend must not contain business-critical ML logic.

API communication should be centralized where practical.

Loading, error, empty, and success states must be handled.

User actions that affect assignments must require clear confirmation where appropriate.

## 12. Security Rules

Never commit:

* Passwords
* API keys
* Database credentials
* JWT secrets
* Private certificates
* Production environment files

Use `.env` files locally and environment variables in deployment.

Passwords must be securely hashed.

Authentication tokens must be handled securely.

Users must only access functionality allowed by their role.

## 13. Testing Rules

Each completed module should be tested before moving to the next module.

At minimum:

* Backend API tests
* Validation tests
* Authentication tests
* Core ML tests
* Recommendation tests
* Frontend functional testing

A feature is not considered complete simply because the UI renders.

## 14. Git Rules

Use Git throughout development.

Create commits after meaningful completed milestones.

Example:

* `feat: add authentication`
* `feat: add developer profiles`
* `feat: add task management`
* `feat: add recommendation engine`
* `fix: correct workload calculation`

Do not accumulate the entire project into one final commit.

## 15. AI-Assisted Development Rules

AI coding assistants must not be treated as the permanent memory of the project.

Every implementation task should use the documentation as context.

AI assistants must:

1. Read relevant documentation.
2. Inspect existing code.
3. Explain what they intend to change when the task is significant.
4. Implement only the requested scope.
5. Test the changes.
6. Report changed files and important decisions.

If requirements are ambiguous or contradictory, the AI must not invent a solution silently.

## 16. Scope Control

The first implementation should remain intentionally simple.

Do not add:

* LLM chatbot
* Autonomous AI agents
* Neural networks
* Real-time model retraining
* Complex MLOps
* Microservices
* Kubernetes
* Paid AI APIs

unless later research or project requirements explicitly justify them.

## 17. Human Oversight

The system is a decision-support platform.

The project manager remains responsible for the final task assignment.

The AI recommendation must never be represented as an unquestionable decision.

## 18. Change Management

Any major change to:

* Technology
* Architecture
* Database structure
* AI approach
* Authentication
* Core business rules

must be reflected in the relevant documentation and `CHANGELOG.md`.

Documentation must be updated before or together with the implementation.

## 19. Priority Order

When making implementation decisions, prioritize:

1. Correctness
2. Proposal requirements
3. Simplicity
4. Maintainability
5. Security
6. Explainability
7. Performance
8. Additional features
