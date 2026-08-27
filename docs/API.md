# API Specification

## 1. API Style

The backend uses REST APIs.

Base path:

`/api`

Authentication:

JWT-based authentication.

Protected endpoints require authentication.

Role permissions must be enforced by the backend.

## 2. Authentication

### POST `/api/auth/register`

Creates a new user account.

Request Body:

```json
{
  "name": "Jane Manager",
  "email": "jane@devalign.ai",
  "password": "Password123!",
  "role": "MANAGER"
}
```

Response (201 Created):

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Jane Manager",
  "email": "jane@devalign.ai",
  "role": "MANAGER",
  "is_active": true,
  "created_at": "2026-08-14T15:00:00.000Z",
  "updated_at": "2026-08-14T15:00:00.000Z"
}
```

### POST `/api/auth/login`

Authenticates a user and returns a Bearer JWT access token.

Request Body:

```json
{
  "email": "jane@devalign.ai",
  "password": "Password123!"
}
```

Response (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Manager",
    "email": "jane@devalign.ai",
    "role": "MANAGER",
    "is_active": true,
    "created_at": "2026-08-14T15:00:00.000Z",
    "updated_at": "2026-08-14T15:00:00.000Z"
  }
}
```

### GET `/api/auth/me`

Returns the authenticated user's profile information.

Header:

```text
Authorization: Bearer <access_token>
```

Response (200 OK):

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Jane Manager",
  "email": "jane@devalign.ai",
  "role": "MANAGER",
  "is_active": true,
  "created_at": "2026-08-14T15:00:00.000Z",
  "updated_at": "2026-08-14T15:00:00.000Z"
}
```


## 3. Users

### GET `/api/users`

Returns users according to the authenticated user's permissions.

### GET `/api/users/{id}`

Returns a specific user.

### PUT `/api/users/{id}`

Updates user information.

## 4. Developers

### GET `/api/developers`

Returns all developer profiles with user info and assigned skills.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
[
  {
    "id": "223e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_name": "Dev User",
    "user_email": "dev@devalign.ai",
    "experience_years": 4.5,
    "availability_status": "AVAILABLE",
    "performance_score": 92.0,
    "created_at": "2026-08-14T18:00:00.000Z",
    "updated_at": "2026-08-14T18:00:00.000Z",
    "skills": [
      {
        "id": "323e4567-e89b-12d3-a456-426614174000",
        "developer_id": "223e4567-e89b-12d3-a456-426614174000",
        "skill_id": "423e4567-e89b-12d3-a456-426614174000",
        "skill_name": "Python",
        "skill_category": "Backend",
        "proficiency_level": 85.0,
        "created_at": "2026-08-14T18:00:00.000Z",
        "updated_at": "2026-08-14T18:00:00.000Z"
      }
    ]
  }
]
```

### POST `/api/developers`

Creates a developer profile for an existing User. Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "experience_years": 4.5,
  "availability_status": "AVAILABLE",
  "performance_score": 92.0
}
```

Response (201 Created): Returns `DeveloperResponse`.

### GET `/api/developers/{id}`

Returns a specific developer profile by ID.

### PUT `/api/developers/{id}`

Updates a developer profile. Requires `ADMIN`, `MANAGER`, or `DEVELOPER` updating their own profile.

Request Body:

```json
{
  "experience_years": 5.0,
  "availability_status": "PARTIAL",
  "performance_score": 95.0
}
```

### DELETE `/api/developers/{id}`

Deletes a developer profile. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.

## 5. Skills Catalog

### GET `/api/skills`

Returns master catalog of technical skills.

Response (200 OK):

```json
[
  {
    "id": "423e4567-e89b-12d3-a456-426614174000",
    "name": "Python",
    "category": "Backend",
    "created_at": "2026-08-14T18:00:00.000Z"
  }
]
```

### POST `/api/skills`

Creates a skill in the master catalog. Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "name": "FastAPI",
  "category": "Backend"
}
```

### PUT `/api/skills/{id}`

Updates skill details. Requires `ADMIN` or `MANAGER` role.

### DELETE `/api/skills/{id}`

Deletes a skill from the catalog. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.

## 6. Developer Skills

### GET `/api/developers/{id}/skills`

Returns all technical skills assigned to a developer profile.

### POST `/api/developers/{id}/skills`

Assigns a skill to a developer with proficiency level (0..100). Requires `ADMIN`, `MANAGER`, or self.

Request Body:

```json
{
  "skill_id": "423e4567-e89b-12d3-a456-426614174000",
  "proficiency_level": 85.0
}
```

### PUT `/api/developers/{id}/skills/{skill_id}`

Updates proficiency level (0..100) of an assigned developer skill.

Request Body:

```json
{
  "proficiency_level": 95.0
}
```

### DELETE `/api/developers/{id}/skills/{skill_id}`

Removes a skill association from a developer profile. Returns 204 No Content.


## 7. Projects Management

### GET `/api/projects`

Returns all projects with creator info and team counts. Supports optional `?status=ACTIVE|COMPLETED|ARCHIVED` filter.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mobile App Redesign",
    "description": "Cross-platform mobile application overhaul",
    "status": "ACTIVE",
    "created_by": "123e4567-e89b-12d3-a456-426614174000",
    "creator_name": "Jane Manager",
    "creator_email": "jane@devalign.ai",
    "created_at": "2026-08-19T10:00:00.000Z",
    "updated_at": "2026-08-19T10:00:00.000Z",
    "teams_count": 2,
    "teams": []
  }
]
```

### POST `/api/projects`

Creates a new project. Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "name": "Mobile App Redesign",
  "description": "Cross-platform mobile application overhaul",
  "status": "ACTIVE"
}
```

Response (201 Created): Returns `ProjectResponse`.

### GET `/api/projects/{id}`

Retrieves project details by ID including associated teams and team members.

### PUT `/api/projects/{id}`

Updates project details or status (`ACTIVE`, `COMPLETED`, `ARCHIVED`). Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "name": "Updated Project Name",
  "status": "COMPLETED"
}
```

### DELETE `/api/projects/{id}`

Deletes a project and its associated teams. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.


## 8. Teams Management

### GET `/api/projects/{project_id}/teams`

Lists all teams belonging to a specific project.

### POST `/api/projects/{project_id}/teams`

Creates a new team under a project. Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "name": "Frontend Mobile Team",
  "description": "Responsible for React Native UI components"
}
```

Response (201 Created): Returns `TeamResponse`.

### GET `/api/teams/{id}`

Retrieves team details by ID with active members.

### PUT `/api/teams/{id}`

Updates team information. Requires `ADMIN` or `MANAGER` role.

### DELETE `/api/teams/{id}`

Deletes a team. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.


## 9. Team Members

### GET `/api/teams/{id}/members`

Returns active members of a team.

### POST `/api/teams/{id}/members`

Adds a developer profile to a team. Requires `ADMIN` or `MANAGER` role. Prevents duplicate active membership.

Request Body:

```json
{
  "developer_id": "223e4567-e89b-12d3-a456-426614174000"
}
```

Response (201 Created): Returns `TeamMemberResponse`.

### DELETE `/api/teams/{id}/members/{developer_id}`

Removes a developer from a team by recording `left_at` timestamp. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.


## 10. Tasks Management

### GET `/api/projects/{project_id}/tasks`

Returns all tasks belonging to a specific project. Supports optional `?status=TODO|IN_PROGRESS|COMPLETED|BLOCKED|CANCELLED` filter.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Mobile App Redesign",
    "team_id": null,
    "team_name": null,
    "title": "Implement Payment Gateway",
    "description": "Integrate Stripe SDK for checkout",
    "category": "Backend",
    "priority": "HIGH",
    "complexity": "MEDIUM",
    "estimated_hours": 16.0,
    "deadline": "2026-09-01T00:00:00.000Z",
    "status": "IN_PROGRESS",
    "created_by": "123e4567-e89b-12d3-a456-426614174000",
    "creator_name": "Jane Manager",
    "created_at": "2026-08-19T10:00:00.000Z",
    "updated_at": "2026-08-19T10:00:00.000Z",
    "required_skills": [],
    "current_assignment": null,
    "assignment_history": []
  }
]
```

### POST `/api/projects/{project_id}/tasks`

Creates a new task in a project. Requires `ADMIN` or `MANAGER` role.

Request Body:

```json
{
  "title": "Implement Payment Gateway",
  "description": "Integrate Stripe SDK for checkout",
  "category": "Backend",
  "priority": "HIGH",
  "complexity": "MEDIUM",
  "estimated_hours": 16.0,
  "status": "TODO"
}
```

Response (201 Created): Returns `TaskResponse`.

### GET `/api/tasks/{id}`

Retrieves task details by ID including required skills and assignment history.

### PUT `/api/tasks/{id}`

Updates task details or status. Requires `ADMIN` or `MANAGER` role.

### DELETE `/api/tasks/{id}`

Deletes a task and its required skill associations. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.


## 11. Task Skills

### GET `/api/tasks/{id}/skills`

Returns required technical skills for a task with target proficiency levels.

### POST `/api/tasks/{id}/skills`

Adds a required skill to a task with required level (0..100). Requires `ADMIN` or `MANAGER` role. Prevents duplicate skill association.

Request Body:

```json
{
  "skill_id": "423e4567-e89b-12d3-a456-426614174000",
  "required_level": 80.0
}
```

Response (201 Created): Returns `TaskSkillResponse`.

### PUT `/api/tasks/{id}/skills/{skill_id}`

Updates required proficiency level of a task skill. Requires `ADMIN` or `MANAGER` role.

### DELETE `/api/tasks/{id}/skills/{skill_id}`

Removes a required skill from a task. Requires `ADMIN` or `MANAGER` role. Returns 204 No Content.


## 12. Task Assignments

### POST `/api/tasks/{id}/assign`

Assigns a developer profile to a task. Requires `ADMIN` or `MANAGER` role. If an active assignment exists, it is marked `REASSIGNED` (`reassigned_at = func.now()`), preserving historical records.

Request Body:

```json
{
  "developer_id": "223e4567-e89b-12d3-a456-426614174000",
  "notes": "Assigned for backend API phase"
}
```

Response (201 Created): Returns `AssignmentResponse`.

### GET `/api/tasks/{id}/assignments`

Returns full auditable assignment history for a task.

### GET `/api/developers/{developer_id}/assignments`

Lists all assignments assigned to a developer profile.

### PUT `/api/assignments/{assignment_id}/status`

Updates assignment status (`ACTIVE`, `COMPLETED`, `REASSIGNED`, `CANCELLED`). Accessible to `ADMIN`, `MANAGER`, or assigned `DEVELOPER`.

### POST `/api/assignments/{assignment_id}/complete`

Shortcut to mark assignment `COMPLETED` and update task status to `COMPLETED`.

### POST `/api/assignments/{assignment_id}/cancel`

Shortcut to cancel an assignment. Requires `ADMIN` or `MANAGER` role.


## 13. Recommendations

### POST `/api/recommendations/tasks/{task_id}`

Generates developer recommendations for a task.

Response should contain:

* Task
* Recommended developers
* Rank
* Score
* Explanation
* Model version

Example:

```json
{
  "task_id": 15,
  "recommendations": [
    {
      "developer_id": 4,
      "rank": 1,
      "score": 0.92,
      "explanation": {
        "skill_match": "high",
        "experience": "high",
        "availability": "medium",
        "workload": "low"
      }
    }
  ]
}
```

### GET `/api/recommendations/tasks/{task_id}`

Returns the latest or stored recommendations for a task.

## 10. Assignments

### POST `/api/assignments`

Creates a task assignment.

### GET `/api/assignments`

Returns assignments.

### PUT `/api/assignments/{id}`

Updates an assignment.

## 14. Workload Engine

### GET `/api/workload`

Returns deterministic workload overview items for all developers.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
[
  {
    "developer_id": "223e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_name": "Dev User",
    "user_email": "dev@devalign.ai",
    "experience_years": 4.5,
    "availability_status": "AVAILABLE",
    "active_task_count": 2,
    "total_estimated_hours": 30.0,
    "weighted_hours": 36.0,
    "capacity_hours": 40.0,
    "workload_score": 90.0,
    "workload_status": "HIGH"
  }
]
```

### GET `/api/workload/summary`

Returns system aggregate workload distribution metrics across all developers.

Response (200 OK):

```json
{
  "total_developers": 5,
  "available_developers_count": 2,
  "balanced_developers_count": 2,
  "high_workload_count": 1,
  "overloaded_developers_count": 0,
  "average_workload_score": 58.5,
  "developers": []
}
```

### GET `/api/workload/developers/{id}`

Retrieves detailed workload calculation breakdown and active tasks list for a developer profile. Accessible to `ADMIN`, `MANAGER`, or self.

### POST `/api/workload/developers/{id}/snapshot`

Creates and saves an immutable historical snapshot record in `workload_records` table. Requires `ADMIN` or `MANAGER` role.

Response (201 Created): Returns `WorkloadRecordResponse`.

### GET `/api/workload/developers/{id}/history`

Returns historical workload snapshot records for a developer profile. Accessible to `ADMIN`, `MANAGER`, or self.


## 15. Feature Engineering & Dataset Preparation

### GET `/api/features/metadata`

Returns the central feature definition catalog detailing feature names, data types, categories, sources, and descriptions.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
[
  {
    "feature_name": "skill_coverage_ratio",
    "data_type": "float",
    "category": "Skill Matching",
    "source": "Derived Ratio",
    "description": "Proportion of required skills matched"
  }
]
```

### GET `/api/features/tasks/{task_id}/candidates`

Generates deterministic candidate feature vectors for all developer profiles for a specific task.

Response (200 OK): Returns `TaskCandidatesResponse`.

### GET `/api/features/pair/{developer_id}/{task_id}`

Extracts structured feature vector for a specific (Developer, Task) candidate pair.

### GET `/api/features/dataset/export`

Exports generated candidate feature vectors as a structured CSV dataset. Requires `ADMIN` or `MANAGER` role.

### GET `/api/features/dataset/download.csv`

Downloads dataset as a raw CSV file. Requires `ADMIN` or `MANAGER` role.


## 16. Developer Recommendations & Explanations

### GET `/api/recommendations/metadata/model`

Returns current active recommendation model metadata.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
{
  "model_type": "deterministic_baseline",
  "model_version": "baseline-v1",
  "training_required": false,
  "training_dataset": null,
  "validation_accuracy": null,
  "description": "Transparent deterministic weighted scoring model combining skill match, coverage, workload, performance, experience, and availability."
}
```

### GET `/api/recommendations/tasks/{task_id}`

Generates and retrieves ranked developer recommendations for a task with reproducible feature contribution explanations. Supports `?regenerate=true` parameter.

Response (200 OK): Returns `RecommendationListResponse`.

### GET `/api/recommendations/{id}`

Retrieves details for a single recommendation record.

### GET `/api/recommendations/{id}/explanations`

Retrieves feature contribution breakdown explanations for a specific recommendation.

Response (200 OK):

```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "feature_name": "weighted_skill_match_score",
    "feature_value": "85.0%",
    "contribution_score": 29.75,
    "direction": "POSITIVE"
  }
]
```

### GET `/api/recommendations/research/ml/metrics`

Retrieves cross-validation summary, validation selection threshold curves, isolated test set evaluation metrics, and feature importances for research ML models.

Header: `Authorization: Bearer <token>`

Response (200 OK):

```json
{
  "cross_validation": {
    "random_forest": { "precision_mean": 1.0, "recall_mean": 0.967, "f1_mean": 0.982, "roc_auc_mean": 0.999, "pr_auc_mean": 0.991 },
    "xgboost": { "precision_mean": 1.0, "recall_mean": 0.960, "f1_mean": 0.978, "roc_auc_mean": 0.997, "pr_auc_mean": 0.971 }
  },
  "validation_selection": { "selected_model": "XGBoost", "selected_threshold": 0.3 },
  "test_evaluation": { "selected_model": { "precision": 1.0, "recall": 1.0, "f1": 1.0, "roc_auc": 1.0, "pr_auc": 1.0 } }
}
```

### GET `/api/recommendations/research/ml/explainability/global`

Retrieves global SHAP feature importance analysis (TreeSHAP) across all 1,500 research dataset candidate pairs.

Response (200 OK):

```json
{
  "environment": "research",
  "dataset_version": "synthetic-v1",
  "model_version": "ml-v1-rf-xgb",
  "total_samples_analyzed": 1500,
  "global_feature_importance": [
    { "feature_name": "min_proficiency_gap", "mean_abs_shap": 4.8065, "percentage": 51.53, "rank": 1 },
    { "feature_name": "dev_workload_score", "mean_abs_shap": 1.5801, "percentage": 16.94, "rank": 2 }
  ]
}
```

### GET `/api/recommendations/research/ml/explainability/local/{developer_id}/{task_id}`

Retrieves candidate-level local SHAP feature attributions explaining suitability prediction for a single developer-task pair.

Response (200 OK):

```json
{
  "environment": "research",
  "model_version": "ml-v1-rf-xgb",
  "developer_name": "Alice Dev",
  "task_title": "Build Auth API",
  "suitability_probability": 0.914,
  "suitability_percentage": 91.4,
  "base_value": -3.214,
  "positive_factors": ["+ min_proficiency_gap: 12.0 (SHAP +2.150)"],
  "negative_factors": [],
  "feature_attributions": [
    { "feature_name": "min_proficiency_gap", "raw_value": 12.0, "shap_contribution": 2.150, "direction": "POSITIVE", "rank": 1 }
  ],
  "research_disclaimer": "These explanations describe the behavior of the research XGBoost model trained on synthetic-v1 data. They do not establish real-world recommendation accuracy."
}
```

## 11.5 Audit Logging, Feedback Loop & Model Governance (Milestone 13)

### POST `/api/recommendations/{id}/feedback`

Submits human reviewer feedback decision (`ACCEPTED`, `REJECTED`, `IGNORED`, `DEFERRED`) with optional comment for a recommendation.

Request Body:

```json
{
  "decision": "ACCEPTED",
  "comment": "Developer possesses strong skill match and current available capacity."
}
```

Response (201 Created):

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "recommendation_id": "880e8400-e29b-41d4-a716-446655440000",
  "reviewer_id": "123e4567-e89b-12d3-a456-426614174000",
  "reviewer_name": "Jane Manager",
  "decision": "ACCEPTED",
  "comment": "Developer possesses strong skill match and current available capacity.",
  "created_at": "2026-08-26T18:00:00Z"
}
```

### GET `/api/recommendations/{id}/audit`

Retrieves single recommendation audit log and preserved feature snapshot.

### GET `/api/recommendations/audit`

Lists recommendation audit logs with optional `?environment=production|research` or `?model_version=...` filtering.

### GET `/api/recommendations/feedback`

Lists all submitted human reviewer feedback records.

### GET `/api/recommendations/research/outcomes`

Lists recommendation assignment lifecycle event outcomes (`RECOMMENDED` ➔ `ACCEPTED` ➔ `ASSIGNED` ➔ `COMPLETED`).

### GET `/api/recommendations/research/dataset-preview`

Retrieves observational real-world training dataset preview metrics and real-world ML dataset training readiness assessment (minimum 200 validated outcomes required).

### GET `/api/recommendations/research/model-registry`

Retrieves model registry provenance records for active production baseline (`baseline-v1`) and experimental research models (`ml-v1-rf-xgb`).

## 12. Dashboard

### GET `/api/dashboard/summary`

Returns:

* Total developers
* Active tasks
* Completed tasks
* Available developers
* Average workload
* Overloaded developers

### GET `/api/dashboard/workload`

Returns workload chart data.

### GET `/api/dashboard/recommendations`

Returns recommendation statistics.

## 13. API Rules

All input must be validated.

Protected routes require authentication.

Role authorization must be enforced server-side.

API errors must use predictable response structures.

Internal exceptions must not be exposed.

Pagination should be added to list endpoints when required.

API contracts should be updated whenever endpoint behaviour changes.
