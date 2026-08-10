# System Architecture

## 1. Architecture Goal

The system will use a modular monolithic architecture.

The objective is to keep the project easy to develop, debug, test, and deploy while maintaining clear separation between the frontend, backend, database, and ML functionality.

## 2. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js        │
                    │      Frontend       │
                    └──────────┬──────────┘
                               │
                            REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │       FastAPI       │
                    │      Backend        │
                    └──────┬────────┬─────┘
                           │        │
                           │        │
                           ▼        ▼
                  ┌────────────┐  ┌──────────────┐
                  │ PostgreSQL │  │  ML Engine   │
                  │  Database  │  │ Python       │
                  └────────────┘  │ sklearn/XGB  │
                                  │ SHAP         │
                                  └──────────────┘
```

## 3. Frontend Layer

The frontend provides the user interface.

Main areas:

* Login
* Dashboard
* Developers
* Skills
* Tasks
* Recommendations
* Workload
* Reports
* Profile/settings

The frontend does not directly communicate with the database.

## 4. Backend Layer

The FastAPI backend is responsible for:

* Authentication
* Authorization
* Request validation
* Business rules
* Database operations
* ML orchestration
* Workload calculation
* Recommendation generation
* Explanation generation

## 5. ML Layer

The ML layer is part of the project backend ecosystem rather than a separate application.

Workflow:

```text
Task
  ↓
Task features
  +
Developer features
  ↓
Feature preparation
  ↓
ML model
  ↓
Developer suitability score
  ↓
Ranking
  ↓
Top recommendations
  ↓
SHAP explanation
```

## 6. Recommendation Flow

```text
Manager creates/selects task
            ↓
System retrieves task requirements
            ↓
System retrieves eligible developers
            ↓
Developer + task features generated
            ↓
ML model predicts suitability
            ↓
Workload/fairness adjustment
            ↓
Developers ranked
            ↓
Top candidates displayed
            ↓
SHAP explanation generated
            ↓
Manager reviews recommendation
            ↓
Manager makes final assignment
```

## 7. Workload Flow

```text
Assigned tasks
      ↓
Task effort
      ↓
Task complexity
      ↓
Deadline pressure
      ↓
Developer availability
      ↓
Workload score
      ↓
Overload detection
      ↓
Redistribution suggestions
```

## 8. Module Structure

Backend modules:

```text
auth
users
developers
skills
tasks
assignments
recommendations
workload
dashboard
```

ML modules:

```text
data
features
training
prediction
evaluation
explainability
```

## 9. Separation of Responsibilities

Frontend:

* Presentation
* User interaction
* API consumption

Backend:

* Authentication
* Business logic
* Database operations
* ML orchestration

Database:

* Persistent application data

ML:

* Developer suitability prediction
* Model evaluation

SHAP:

* Recommendation explanation

## 10. Architectural Principle

Keep the system simple.

The project does not require:

* Microservices
* Event-driven architecture
* Kubernetes
* Dedicated AI application
* Dedicated ML server
* Real-time model retraining

These may be considered later only if actual requirements justify them.
