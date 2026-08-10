# Development Roadmap

## Phase 0 — Project Foundation

Status: Pending

Tasks:

* Finalize documentation
* Initialize Git repository
* Initialize frontend
* Initialize backend
* Configure PostgreSQL
* Configure environment variables
* Establish folder structure
* Verify frontend/backend/database connectivity

Deliverable:

Working project skeleton.

---

## Phase 1 — Authentication

Tasks:

* User model
* Password hashing
* Registration
* Login
* JWT authentication
* Role-based authorization
* Protected routes
* Frontend authentication state

Deliverable:

Users can securely log in according to their roles.

---

## Phase 2 — Developer Management

Tasks:

* Developer profiles
* Developer CRUD
* Skills
* Skill proficiency
* Experience
* Availability
* Performance score

Deliverable:

Managers can manage developer information.

---

## Phase 3 — Task Management

Tasks:

* Task CRUD
* Required skills
* Complexity
* Priority
* Estimated effort
* Deadline
* Status

Deliverable:

Managers can create and manage development tasks.

---

## Phase 4 — Basic Dashboard

Tasks:

* Developer count
* Task count
* Task status
* Basic workload
* Available developers
* Overloaded developers

Deliverable:

Functional project management dashboard.

---

## Phase 5 — Dataset and ML Preparation

Tasks:

* Identify available dataset
* Prepare data
* Clean data
* Define features
* Generate training data if necessary
* Create training pipeline
* Establish evaluation methodology

Deliverable:

Prepared ML dataset and reproducible training pipeline.

---

## Phase 6 — ML Recommendation Engine

Tasks:

* Train Decision Tree baseline
* Train Random Forest
* Train XGBoost
* Compare models
* Select suitable model
* Save selected model
* Implement prediction service

Deliverable:

Working developer recommendation engine.

---

## Phase 7 — Recommendation Integration

Tasks:

* Recommendation API
* Ranking
* Recommendation UI
* Score display
* Candidate filtering
* Recommendation history

Deliverable:

Manager can request recommendations for a task.

---

## Phase 8 — Explainable AI

Tasks:

* Integrate SHAP
* Generate feature contributions
* Create human-readable explanations
* Display recommendation reasoning
* Test explanations

Deliverable:

Every recommendation can be explained.

---

## Phase 9 — Workload Balancing

Tasks:

* Workload calculation
* Workload thresholds
* Overload detection
* Workload visualisation
* Alternative developer suggestions
* Fairness-aware ranking/redistribution

Deliverable:

System can identify workload imbalance and suggest alternatives.

---

## Phase 10 — Testing and Evaluation

Tasks:

* Backend tests
* Frontend tests
* Authentication tests
* Recommendation tests
* ML evaluation
* Workload evaluation
* SHAP testing
* Security review
* User evaluation preparation

Deliverable:

Tested system with documented evaluation results.

---

## Phase 11 — Final UI and Documentation

Tasks:

* UI polish
* Responsive design
* Error handling
* Loading states
* Empty states
* Accessibility improvements
* Research documentation
* Technical documentation
* User documentation

Deliverable:

Presentation-ready system.

---

## Phase 12 — Deployment

Tasks:

* Production environment
* PostgreSQL deployment
* Backend deployment
* Frontend deployment
* Environment variables
* HTTPS
* Database backup strategy
* Final testing

Deliverable:

Accessible deployed application.

---

# Development Rules

Each phase should be completed and tested before moving to the next phase.

Each meaningful phase should receive a Git commit.

Do not build advanced features while core modules are unstable.

Priority:

1. Working system
2. Correct data
3. Recommendation engine
4. Explainability
5. Workload balancing
6. UI polish
7. Additional features
