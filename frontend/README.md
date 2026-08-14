# DevAlign AI

## Explainable AI-Based Developer Recommendation and Workload Balancing System

DevAlign AI is a research-oriented AI-assisted decision-support platform designed to help software development teams identify suitable developers for software tasks while considering developer expertise, workload, availability, fairness, and task requirements.

The system does **not** automatically replace project managers or make final assignment decisions. It provides ranked recommendations, explanations, and workload insights so that human users can make informed decisions.

---

# 1. Project Objective

The primary objective is to design and develop an Explainable AI-based decision-support system that:

* Recommends suitable developers for software tasks.
* Considers developer skills and experience.
* Considers current workload and availability.
* Explains why developers receive particular recommendation scores.
* Identifies workload imbalance.
* Suggests fairer task redistribution.
* Keeps final assignment decisions under human control.

The project is also intended to evaluate machine-learning approaches and their usefulness in developer recommendation.

---

# 2. Research Focus

The project focuses on the combination of:

```text
Machine Learning
      +
Explainable AI
      +
Workload Analysis
      +
Fairness
      +
Human Decision Support
```

The research specifically investigates developer recommendation and workload balancing rather than attempting to build a general-purpose AI assistant.

---

# 3. Current Architecture

```text
┌──────────────────────────────┐
│      Next.js Frontend        │
│       TypeScript / React     │
└──────────────┬───────────────┘
               │ REST API
               ↓
┌──────────────────────────────┐
│       FastAPI Backend        │
│          Python              │
└──────────────┬───────────────┘
               │ SQLAlchemy
               ↓
┌──────────────────────────────┐
│        PostgreSQL            │
│       Primary Database       │
└──────────────────────────────┘
```

The ML component will be implemented using Python and integrated with the backend.

---

# 4. Technology Stack

## Frontend

* Next.js 14
* React 18
* TypeScript
* Vanilla CSS

## Backend

* Python 3.12
* FastAPI
* Uvicorn
* Pydantic
* SQLAlchemy

## Database

* PostgreSQL
* SQLAlchemy ORM
* Database migrations

## Machine Learning

Initial candidates:

* Decision Tree
* Random Forest
* XGBoost

Supporting Python ML libraries will be selected during the ML implementation phase.

## Explainable AI

Primary:

* SHAP

LIME may be evaluated if it provides additional value for local explanations.

## Visualization

The project may use appropriate visualization libraries for workload and model evaluation.

---

# 5. Core System Modules

The planned system consists of:

```text
Authentication
      ↓
Developer Management
      ↓
Skill Management
      ↓
Project & Team Management
      ↓
Task Management
      ↓
Developer Recommendation
      ↓
Explainable AI
      ↓
Workload Analysis
      ↓
Fair Redistribution Suggestions
      ↓
Evaluation & Reporting
```

Modules will be implemented incrementally.

---

# 6. Database

The finalized database design is documented in:

`docs/DATABASE.md`

The database includes:

* Users
* Developer profiles
* Skills
* Developer skills
* Projects
* Teams
* Team members
* Tasks
* Task skills
* Assignments
* Recommendations
* Recommendation explanations
* Workload records

Assignment history will be retained because historical assignment information may later contribute to ML training and evaluation.

---

# 7. ML Recommendation Concept

The recommendation system will evaluate a developer in relation to a specific task.

Conceptually:

```text
Developer
+
Task
+
Developer–Task Relationship
+
Workload
      ↓
Feature Engineering
      ↓
ML Model
      ↓
Suitability Score
      ↓
Developer Ranking
```

Example:

```text
Task: Payment API

Developer A → 0.92
Developer B → 0.84
Developer C → 0.71
```

The score is initially treated as a model suitability score.

It must not automatically be interpreted as a calibrated probability of successful completion unless calibration experiments support that interpretation.

---

# 8. ML Features

Potential features include:

### Developer Features

* Experience
* Skill proficiency
* Historical performance
* Availability
* Previous similar tasks
* Current workload

### Task Features

* Required skills
* Required skill level
* Task category
* Complexity
* Priority
* Estimated effort
* Deadline pressure

### Developer–Task Features

* Skill match
* Experience match
* Similar task experience

The final feature set must be documented in `docs/AI_MODEL.md`.

---

# 9. Dataset Strategy

The preferred source of training data is historical software-development task and assignment data.

If sufficient real historical data is unavailable, a controlled synthetic dataset may be used for the initial prototype and research experimentation.

Synthetic data must:

* Be clearly identified as synthetic.
* Not be represented as real-world observations.
* Be generated using documented assumptions.
* Be evaluated separately from any real dataset.

The project should not claim real-world effectiveness solely from synthetic data.

---

# 10. ML Model Strategy

Initial candidate models:

```text
Decision Tree
Random Forest
XGBoost
```

The models will be trained and evaluated using the same appropriate dataset and feature set where possible.

The final model will be selected based on experimental results rather than assuming one algorithm is superior.

Initial evaluation metrics include:

* Accuracy
* Precision
* Recall
* F1-score

Additional ranking-specific metrics may be introduced if required by the final recommendation formulation.

---

# 11. Explainable AI

SHAP will be used to explain model recommendations.

Example:

```text
Developer A → Score: 0.92

Positive factors:
+ Strong skill match
+ Previous similar tasks
+ Relevant experience

Negative factor:
- High current workload
```

The purpose of XAI is to improve transparency and help project managers understand the recommendation.

---

# 12. Workload Balancing

Workload analysis is treated as a distinct system component from the ML recommendation model.

Workload may consider:

* Number of active tasks
* Task complexity
* Estimated hours
* Deadline pressure
* Developer availability

Conceptually:

```text
Task Load
+
Effort Load
+
Complexity
+
Deadline Pressure
      ↓
Workload Score
```

The exact weighting will be finalized through implementation and evaluation.

The system should identify overloaded developers and suggest redistribution where appropriate.

---

# 13. Human Oversight

DevAlign AI is a decision-support system.

The system should:

* Recommend.
* Explain.
* Highlight workload.
* Suggest redistribution.

The system should **not** automatically make irreversible task assignments without human approval.

Final task allocation remains with an authorized human user.

---

# 14. Fairness

The project will consider fairness in task distribution.

The system should avoid repeatedly recommending the same highly skilled developer when another qualified developer is available and has lower workload.

Historical popularity must not automatically be treated as developer quality.

Fairness should be evaluated as part of the workload and recommendation analysis.

---

# 15. Current Project Status

## Milestone 1 — Project Initialization

**Status: COMPLETED**

Verified:

* Next.js frontend
* FastAPI backend
* PostgreSQL configuration
* SQLAlchemy connection layer
* Environment configuration
* Frontend build
* Backend health endpoint
* Frontend → backend communication foundation

No files were deleted during initialization.

---

# 16. Upcoming Milestones

### Milestone 2

Database Schema & Migrations

### Milestone 3

Authentication & User Roles

### Milestone 4

Developer & Skill Management

### Milestone 5

Projects, Teams & Task Management

### Milestone 6

Workload Calculation Engine

### Milestone 7

Dataset Generation & Feature Engineering

### Milestone 8

ML Model Training & Comparison

### Milestone 9

Recommendation API

### Milestone 10

SHAP Explainability

### Milestone 11

Recommendation + Workload Integration

### Milestone 12

Dashboard & User Experience

### Milestone 13

Testing & Evaluation

### Milestone 14

Research Results & Final Documentation

---

# 17. Development Rule

Development must happen incrementally.

Do not ask an AI coding agent to implement the entire project in one request.

Each milestone should:

1. Read the project documentation.
2. Understand the current architecture.
3. Implement only the assigned milestone.
4. Test the implementation.
5. Report changes.
6. Identify problems.
7. Stop.

The next milestone should only begin after the previous milestone has been reviewed.

---

# 18. Source of Truth

The `/docs` directory is the persistent project knowledge base.

Important documents include:

```text
docs/
├── PROJECT_RULES.md
├── TECH_STACK.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── FEATURES.md
├── AI_MODEL.md
├── ROADMAP.md
├── CHANGELOG.md
└── RESEARCH_PROJECT.md
```

When a new implementation decision conflicts with existing documentation, the conflict must be identified before implementation rather than silently changing the architecture.

---

# 19. Important Research Limitation

The system is intended primarily as an AI-assisted decision-support prototype and research project.

Model performance depends strongly on:

* Dataset quality
* Feature quality
* Historical assignment quality
* Label quality
* Dataset size
* Synthetic-data assumptions, if synthetic data is used

Therefore, experimental results must be interpreted within the limitations of the available dataset.

---

# 20. Development Philosophy

The priority is:

```text
Correctness
   ↓
Simplicity
   ↓
Reproducibility
   ↓
Explainability
   ↓
Performance
```

Avoid unnecessary AI services, APIs, microservices, infrastructure, and complexity unless they provide measurable value to the research objective.
