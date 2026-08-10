# Feature Specification

## 1. Authentication and Roles

The system supports three roles:

### Admin

Responsible for:

* User management
* Skill management
* System administration

### Manager

Responsible for:

* Managing developers
* Creating and managing tasks
* Generating recommendations
* Reviewing workload
* Making final assignments
* Reviewing reports

### Developer

Responsible for:

* Viewing assigned tasks
* Updating task status where permitted
* Maintaining relevant profile information
* Viewing personal workload

## 2. Developer Profile Management

The system stores:

* Name
* Skills
* Skill proficiency
* Experience
* Previous project/task experience
* Performance score
* Availability
* Current workload

Developer profiles should be updated as relevant activity changes.

## 3. Skill Management

Managers/admins can maintain the skill catalogue.

Each skill has:

* Name
* Category

Developers can have multiple skills.

Each developer skill has a proficiency level.

## 4. Task Management

Managers can create tasks containing:

* Title
* Description
* Required skills
* Category
* Priority
* Complexity
* Estimated effort
* Deadline
* Status

## 5. Developer Recommendation

The system analyses:

### Developer features

* Technical skills
* Skill proficiency
* Previous similar tasks
* Experience
* Performance history
* Availability
* Current workload

### Task features

* Required technologies
* Complexity
* Priority
* Estimated effort
* Deadline

The system produces a ranked list of suitable developers.

## 6. Recommendation Review

For each recommendation the manager should see:

* Developer name
* Recommendation score
* Rank
* Key matching factors
* Workload
* Availability
* Explanation

The manager can choose whether to accept the recommendation.

## 7. Explainable AI

The system provides explanations for recommendations.

Example:

```text
Developer A

Strong factors:
- High Java proficiency
- Previous similar tasks
- Good availability

Negative factors:
- Moderate current workload
```

SHAP is the primary explanation mechanism.

## 8. Workload Analysis

The system calculates developer workload using factors including:

* Number of active tasks
* Task complexity
* Estimated hours
* Deadline pressure
* Availability

The proposal defines the conceptual workload calculation as:

Workload Score =
(Task Number × Complexity Weight)

* Estimated Hours
* Deadline Pressure

The final implementation should normalize the score to a consistent range for display.

## 9. Workload Balancing

The system identifies:

* Overloaded developers
* Underutilized developers
* Suitable alternative developers

It may suggest redistribution based on:

* Skill suitability
* Current workload
* Availability
* Fairness

The system does not automatically redistribute tasks.

## 10. Dashboard

The dashboard should provide:

* Total developers
* Active tasks
* Completed tasks
* Workload distribution
* Overloaded developers
* Available developers
* Recommendation statistics

## 11. Reports and Analytics

The system should provide information useful for evaluation, including:

* Recommendation performance
* Workload distribution
* Number of overloaded developers
* Allocation time
* Assignment statistics

## 12. Research Evaluation

The system should support evaluation using:

### Recommendation metrics

* Accuracy
* Precision
* Recall
* F1-score

### Workload metrics

* Workload distribution variance
* Average workload difference
* Number of overloaded developers
* Task completion time

### User evaluation

Potential users:

* Software developers
* Project managers
* Students with software project experience

Evaluation areas:

* Ease of use
* Trust
* Explanation quality
* Usefulness

## 13. MVP Scope

The first working version must contain:

* Authentication
* Roles
* Developer management
* Skills
* Task management
* Basic dashboard
* Recommendation engine
* SHAP explanation
* Workload calculation

Features outside this scope should not delay the first working version.
