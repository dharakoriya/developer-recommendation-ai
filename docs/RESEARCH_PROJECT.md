# DevAlign AI

## Research & Technical Project Record

**Project Title:** Explainable AI-Based Developer Recommendation and Workload Balancing System

**Project Type:** Research-oriented software system

**Document Purpose:** Living technical and research record for implementation, experimentation, evaluation, and future research-paper/dissertation writing.

---

# 1. Research Background

Software development teams must continuously allocate tasks among developers with different skills, experience levels, availability, and workloads.

The original research proposal identifies several limitations of traditional manual task allocation, including the increasing complexity of software projects, the need to evaluate multiple developer and task factors simultaneously, uneven workload distribution, dependence on individual managerial judgement, limited transparency in AI recommendation systems, and insufficient consideration of fairness and workload.

The proposed research therefore focuses on an AI-assisted decision-support system combining:

* Machine Learning
* Explainable AI
* Developer recommendation
* Workload analysis
* Fair task distribution
* Human oversight

The original proposal specifically positions the system as a tool for supporting project managers rather than replacing human judgement.

---

# 2. Research Aim

The research aim is:

> To design and develop an Explainable Artificial Intelligence-based decision support system that recommends suitable developers for software tasks while analysing workload balance and promoting fair task distribution within software development teams.

This is the central research objective and should not be changed casually during implementation.

---

# 3. Research Questions

The current research questions are:

### RQ1

How can Artificial Intelligence techniques be applied to automate developer recommendation and software task allocation within development teams?

### RQ2

How can an AI-based system consider developer expertise, workload, fairness, and task requirements when recommending developers?

### RQ3

How can Explainable AI improve transparency, trust, and understanding in AI-assisted developer recommendation systems?

### RQ4

How effectively can an AI-assisted allocation system improve workload balance compared with traditional manual task assignment approaches?

These questions originate from the project proposal and remain the primary research questions.

---

# 4. Research Problem

The central research problem is that software task allocation requires simultaneous consideration of multiple factors.

Traditional allocation can depend heavily on individual judgement.

AI-based developer recommendation can assist with technical suitability, but recommendation alone does not necessarily address:

* Explainability
* Workload awareness
* Fairness
* Dynamic developer information
* Human-centred decision support

The proposed system therefore combines recommendation, explainability, and workload analysis rather than treating developer selection as a simple skill-matching problem.

---

# 5. Proposed Contribution

The intended contribution is a prototype decision-support system combining:

```text
Developer Recommendation
        +
Explainable AI
        +
Workload Analysis
        +
Fairness Considerations
        +
Human Decision Support
```

The original proposal identifies the expected outcomes as:

* Suitable developer recommendations
* Explanation of recommendations
* Workload imbalance analysis
* Fair task redistribution suggestions
* Improved transparency in AI-assisted project management

---

# 6. System Scope

## Included

The system will support:

* User management
* Developer profiles
* Developer skills
* Projects
* Teams
* Software tasks
* Task requirements
* Historical assignments
* Workload calculation
* Developer recommendation
* ML model comparison
* Explainable recommendations
* Workload imbalance analysis
* Fair redistribution suggestions
* Human approval of final assignments
* Evaluation and reporting

## Not Required for Initial System

The project does not require:

* LLM chatbot
* Generative AI
* RAG
* Vector database
* AI agents
* GPU infrastructure
* Real-time model retraining
* Neural networks unless experimentation demonstrates a clear need
* External AI APIs

These are deliberately excluded to keep the project focused and implementable within the available time.

---

# 7. System Architecture

The implemented foundation is:

```text
┌────────────────────────────┐
│     Next.js Frontend       │
│      TypeScript/React      │
└─────────────┬──────────────┘
              │ REST API
              ↓
┌────────────────────────────┐
│      FastAPI Backend       │
│           Python           │
└─────────────┬──────────────┘
              │ SQLAlchemy
              ↓
┌────────────────────────────┐
│        PostgreSQL          │
│       Source of Truth      │
└────────────────────────────┘
```

The ML component will be implemented in Python and integrated with the backend.

---

# 8. Database Architecture

The database contains:

```text
users
developer_profiles
skills
developer_skills
projects
teams
team_members
tasks
task_skills
assignments
recommendations
recommendation_explanations
workload_records
```

The complete schema is defined in:

`docs/DATABASE.md`

The database intentionally retains historical assignment information because it may become valuable for future ML training and evaluation.

---

# 9. Developer Representation

A developer is represented using multiple categories of information.

## Skills

Each developer can possess multiple skills.

Each skill has a proficiency level.

Example:

```text
Python     → 90
React      → 80
PostgreSQL → 75
```

## Experience

The profile stores overall development experience.

## Performance

A historical performance score may be used where reliable data is available.

## Availability

Availability represents the developer's current ability to accept work.

## Workload

Current workload is derived from actual active assignments rather than being treated as a manually maintained developer-profile field.

---

# 10. Task Representation

A task contains:

* Project
* Team where applicable
* Title
* Description
* Category
* Priority
* Complexity
* Estimated effort
* Deadline
* Status

Tasks also have required skills and required proficiency levels.

Example:

```text
Task: Payment API

Python       → 80
FastAPI      → 75
PostgreSQL   → 70
```

---

# 11. Recommendation Problem Formulation

The recommendation problem is treated as a developer-task suitability problem.

Conceptually:

```text
Developer Information
          +
Task Information
          +
Developer–Task Relationship
          +
Workload Information
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

The system ranks candidates rather than automatically assigning the task.

---

# 12. ML Feature Categories

## Developer Features

Potential features:

* Experience years
* Skill proficiency
* Historical performance
* Availability
* Previous similar tasks
* Current workload

## Task Features

Potential features:

* Required skills
* Required proficiency
* Category
* Complexity
* Priority
* Estimated effort
* Deadline pressure

## Relationship Features

Potential derived features:

* Skill match percentage
* Experience match
* Similar-task experience
* Skill gap

## Workload Features

Potential features:

* Active task count
* Active estimated hours
* Workload score
* Availability factor

The exact feature set must be recorded before final model experiments.

---

# 13. Dataset Strategy

The preferred training-data source is real historical software-development data where it can be obtained ethically and legally.

However, the project may not have access to sufficient historical company assignment data.

Therefore, the initial implementation can use a controlled synthetic dataset.

The synthetic dataset should model:

* Developers
* Skills
* Tasks
* Task requirements
* Assignments
* Workload
* Historical outcomes

Synthetic data must be clearly labelled as synthetic.

It must not be presented as empirical real-world evidence.

---

# 14. Training Record Concept

A useful training representation is:

```text
Task
+
Developer
+
Developer–Task Features
+
Historical Outcome
```

Example:

| Feature            |  Example |
| ------------------ | -------: |
| Skill match        |      92% |
| Experience match   |      80% |
| Similar tasks      |        8 |
| Workload           |      30% |
| Availability       |      90% |
| Task complexity    |     High |
| Estimated hours    |       16 |
| Historical outcome | Positive |

This allows the model to learn a relationship between developer-task characteristics and historical outcomes.

---

# 15. Important Label Limitation

A critical research limitation is that:

> A developer not being assigned to a task does not automatically mean that developer was unsuitable.

They may not have been assigned because of:

* Availability
* Managerial decision
* Team structure
* Project constraints
* Timing
* Other unknown factors

Therefore, simply treating:

```text
assigned = 1
not assigned = 0
```

as ground truth can introduce label bias.

The project should use assignment outcomes and available historical information as carefully as possible.

This limitation should be explicitly discussed in the research paper.

---

# 16. Candidate ML Models

The initial comparison will focus on:

### Decision Tree

Used as a simple interpretable baseline.

### Random Forest

Used as a stronger ensemble baseline for structured/tabular data.

### XGBoost

Used as a stronger gradient-boosting candidate for structured data.

The final model should be selected experimentally.

The original proposal specifies Scikit-learn and XGBoost as candidate ML technologies.

---

# 17. Model Evaluation

The original proposal identifies:

* Accuracy
* Precision
* Recall
* F1-score

as recommendation-model evaluation measures.

These will be used where appropriate to the final prediction formulation.

If the final system is primarily evaluated as a ranking system, additional ranking metrics may be considered during experimentation.

The research record must document why any additional metric is introduced.

---

# 18. Explainable AI

The system will primarily use SHAP.

SHAP will identify how individual features contribute to a recommendation.

Conceptually:

```text
Prediction
    ↓
SHAP Analysis
    ↓
Feature Contributions
    ↓
Human-readable Explanation
```

Example:

```text
Developer A → Score 0.92

Positive:
Skill match          +0.31
Similar experience   +0.22
Experience           +0.18

Negative:
Current workload     -0.08
```

The original proposal also identifies LIME as a possible local explanation technique.

SHAP is currently the primary XAI approach because the project requires understandable feature-level explanations.

---

# 19. Workload Balancing

Workload balancing is treated as a separate but integrated component.

The original proposal describes workload using:

```text
Task Number
+
Complexity Weight
+
Estimated Hours
+
Deadline Pressure
```

and proposes redistribution when workload exceeds a defined threshold.

The implementation will retain this conceptual approach while allowing the exact weighting to be evaluated during development.

---

# 20. Recommendation + Workload Integration

Recommendation and workload should not be treated as identical concepts.

The system can first calculate:

```text
ML Suitability Score
```

and separately calculate:

```text
Workload Score
```

These can then contribute to final candidate ranking.

Example:

```text
Developer A
ML suitability = 0.94
Workload = 85%

Developer B
ML suitability = 0.88
Workload = 45%
```

The system should be capable of showing why Developer B may be preferable despite Developer A having a higher technical suitability score.

The exact ranking formula must be documented before final evaluation.

---

# 21. Fairness Considerations

The project does not define fairness as simply giving every developer the same number of tasks.

Fairness should consider:

* Developer suitability
* Workload
* Availability
* Task requirements
* Opportunity for qualified developers
* Repeated allocation patterns

The system should avoid repeatedly selecting one highly skilled developer solely because that developer has historically received many similar tasks.

The original proposal explicitly identifies fairness and avoidance of historical popularity bias as ethical considerations.

---

# 22. Human Oversight

The system is a decision-support system.

The workflow is:

```text
Task
 ↓
AI Recommendation
 ↓
Explanation
 ↓
Workload Analysis
 ↓
Manager Review
 ↓
Final Assignment
```

The AI should not independently make irreversible allocation decisions.

The final decision remains with an authorized human user.

---

# 23. Privacy and Ethics

The project must consider:

### Data Privacy

Developer information should be anonymised where research data is used.

### Fairness

Historical popularity should not automatically determine future recommendations.

### Transparency

Recommendations should be explainable.

### Human Oversight

The AI should support rather than replace human judgement.

These principles are directly aligned with the original research proposal.

---

# 24. Evaluation Framework

The final evaluation should cover multiple dimensions.

## ML Performance

* Accuracy
* Precision
* Recall
* F1-score
* Appropriate ranking metrics if required

## Workload

The original proposal identifies:

* Workload distribution variance
* Average workload difference
* Number of overloaded developers
* Task completion time

## User Evaluation

The proposal identifies potential participants including:

* Software developers
* Project managers
* Students with software project experience

The proposed evaluation areas include:

* Ease of use
* Trust
* Explanation quality
* Usefulness

with a 5-point Likert scale.

---

# 25. Experimental Comparison

The research should compare the proposed approach against an appropriate baseline.

Potential comparison:

```text
Manual / Rule-based Allocation
              VS
AI-assisted Recommendation
```

Possible comparison dimensions:

| Dimension              | Baseline | Proposed System |
| ---------------------- | -------- | --------------- |
| Allocation time        | Measure  | Measure         |
| Workload balance       | Measure  | Measure         |
| Recommendation quality | Measure  | Measure         |
| Explainability         | Limited  | Measure         |
| Fairness               | Measure  | Measure         |

The exact experimental design will be finalized before evaluation.

---

# 26. Research Limitations

The following limitations must be acknowledged if they apply to the final implementation:

### Dataset limitation

Synthetic data cannot establish real-world effectiveness by itself.

### Historical bias

Historical assignment data may contain human bias.

### Label limitation

Assignment decisions do not necessarily represent objective developer suitability.

### Sample size

A small dataset may limit generalisation.

### Model limitation

Different models may perform differently depending on dataset characteristics.

### Workload approximation

A workload score is an approximation and may not capture every aspect of real developer workload.

### Human decision-making

The final assignment remains influenced by managerial judgement.

---

# 27. Current Technical Decisions

The following decisions are currently locked:

| Area               | Decision                                           |
| ------------------ | -------------------------------------------------- |
| Frontend           | Next.js 14 + React + TypeScript                    |
| Backend            | FastAPI + Python                                   |
| Database           | PostgreSQL                                         |
| ORM                | SQLAlchemy                                         |
| ML                 | Python                                             |
| Candidate Models   | Decision Tree, Random Forest, XGBoost              |
| XAI                | SHAP primarily                                     |
| Workload           | Separate workload calculation component            |
| Recommendation     | Ranked developer suitability                       |
| Human Approval     | Required                                           |
| Training Data      | Real historical data preferred; synthetic fallback |
| Architecture       | Frontend → FastAPI → PostgreSQL                    |
| Development        | Incremental milestones                             |
| AI Coding Strategy | One milestone at a time                            |

---

# 28. Current Project Status

## Phase 1 — Research and Planning

**Status: Completed**

Research direction and system objectives established.

## Phase 2 — Requirements and System Design

**Status: Completed**

Database, architecture, feature strategy, ML strategy and implementation direction established.

## Phase 3 — Project Initialization

**Status: Completed**

Verified:

* Next.js frontend
* FastAPI backend
* PostgreSQL configuration
* SQLAlchemy
* Environment configuration
* Frontend build
* Backend health endpoint
* Basic frontend/backend communication

---

# 29. Current Development Milestone

## Milestone 2 — Database Schema & Migrations

The immediate implementation objective is:

```text
docs/DATABASE.md
       ↓
SQLAlchemy Models
       ↓
Database Migration
       ↓
PostgreSQL Schema
       ↓
Relationship Tests
```

Only database-related functionality should be implemented during this milestone.

Authentication, dashboard, ML, recommendation, and workload UI should remain outside this milestone.

---

# 30. Research Development Workflow

The project will use the following development process:

```text
Research / Requirement
        ↓
Documentation
        ↓
Small Implementation Milestone
        ↓
AI Coding Agent
        ↓
Automated / Manual Testing
        ↓
Review
        ↓
Git Checkpoint
        ↓
Next Milestone
```

The `/docs` directory serves as the persistent project knowledge base.

This prevents implementation decisions from depending on the context of a single AI conversation.

---

# 31. Research Paper Mapping

The implementation can later contribute evidence to the following research-paper sections:

## Introduction

Problem, motivation, research aim and research questions.

## Literature Review

Existing developer recommendation, workload balancing, XAI and AI-assisted software engineering research.

## Methodology

Dataset, feature engineering, model selection, workload calculation, XAI and evaluation methodology.

## System Design

Architecture, database, modules and recommendation workflow.

## Implementation

Frontend, backend, database, ML pipeline and XAI integration.

## Experiments

Model comparison and workload experiments.

## Results

Model metrics, workload metrics, explainability findings and user evaluation.

## Discussion

Interpretation of results, limitations, fairness, explainability and practical usefulness.

## Conclusion

Research contribution, findings and future work.

---

# 32. Evidence Collection Rule

During development, important research evidence should be retained.

Examples:

* Dataset versions
* Dataset generation assumptions
* Feature definitions
* Model configurations
* Training results
* Evaluation metrics
* Model comparison results
* Workload measurements
* Screenshots where appropriate
* User-study results
* Important implementation decisions

Do not rely on memory when writing the final research paper.

Record measurable results as the project progresses.

---

# 33. Final Research Principle

The project should never claim that the AI system is effective merely because it produces recommendations.

Effectiveness must be demonstrated through appropriate experiments and evaluation.

Likewise:

```text
High model score
≠
Guaranteed successful developer assignment
```

and:

```text
Synthetic dataset performance
≠
Real-world effectiveness
```

The research should clearly distinguish:

* What was implemented
* What was measured
* What was observed
* What was inferred
* What remains a limitation

This distinction is essential for a credible research paper.
