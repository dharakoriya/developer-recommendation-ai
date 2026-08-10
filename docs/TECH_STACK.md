# Technology Stack

## 1. Overview

The project will use a simple full-stack architecture with a Python-based ML layer.

The goal is to satisfy the research requirements while minimizing unnecessary infrastructure, development time, and operational cost.

## 2. Frontend

Technology:

* Next.js
* TypeScript
* React

Responsibilities:

* Authentication interface
* Dashboard
* Developer management
* Task management
* Recommendation interface
* Workload visualisation
* Recommendation explanations
* Reports

The frontend must communicate with the backend through REST APIs.

## 3. Backend

Technology:

* Python
* FastAPI

Responsibilities:

* Authentication
* Authorization
* User management
* Developer management
* Task management
* Assignment management
* Recommendation API
* Workload analysis
* SHAP explanation generation
* Database access
* Application business logic

## 4. Database

Technology:

* PostgreSQL

Reasons:

* Relational data fits the project well.
* Strong relationships are required between developers, skills, tasks, assignments, and recommendations.
* Mature and free/open-source.
* Easy to run locally.
* Suitable for inexpensive deployment.

## 5. Machine Learning

Primary language:

* Python

Libraries:

* scikit-learn
* XGBoost
* pandas
* NumPy

Candidate models:

1. Random Forest
2. XGBoost
3. Decision Tree

The models will be evaluated and the strongest suitable model will be selected for the final recommendation system.

Neural Networks are not part of the initial implementation because they add complexity without being necessary for the first working system.

## 6. Explainable AI

Primary library:

* SHAP

SHAP will explain the contribution of input features to individual recommendations.

LIME may be investigated if required for research comparison, but it is not required for the initial implementation.

## 7. Visualisation

Preferred:

* Chart.js or a lightweight equivalent for frontend charts.

Possible charts:

* Developer workload
* Workload distribution
* Task status
* Recommendation scores
* Skill distribution
* Assignment statistics

## 8. Authentication

Use application-managed authentication.

Recommended approach:

* Email/password login
* Secure password hashing
* JWT-based authentication
* Role-based authorization

Roles:

* Admin
* Manager
* Developer

## 9. Development Tools

Recommended:

* Git
* GitHub
* VS Code or equivalent IDE
* Python virtual environment
* Node.js/npm
* PostgreSQL local installation

## 10. Infrastructure

Development:

Run frontend, backend, PostgreSQL, and ML locally.

Production:

Use the least expensive suitable hosting option.

No paid infrastructure is required during initial development.

## 11. Cost Strategy

The project should use open-source technologies wherever practical.

Target development software cost:

₹0

No paid AI API is required.

No GPU is required for the initial ML models.

No separate ML hosting is required initially.

## 12. Technology Constraints

Do not introduce a new technology merely because it is popular.

Every additional dependency should have a clear purpose.

The architecture should remain understandable to a developer who has not worked on the project previously.
