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


## 7. Tasks

### GET `/api/tasks`

Returns tasks.

### GET `/api/tasks/{id}`

Returns a task.

### POST `/api/tasks`

Creates a task.

### PUT `/api/tasks/{id}`

Updates a task.

### DELETE `/api/tasks/{id}`

Deletes/cancels a task according to business rules.

## 8. Task Skills

### GET `/api/tasks/{id}/skills`

Returns required skills.

### POST `/api/tasks/{id}/skills`

Adds a required skill.

### PUT `/api/tasks/{id}/skills/{skill_id}`

Updates required proficiency.

### DELETE `/api/tasks/{id}/skills/{skill_id}`

Removes a required skill.

## 9. Recommendations

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

## 11. Workload

### GET `/api/workload`

Returns current workload information.

### GET `/api/workload/developers/{id}`

Returns a developer's workload.

### GET `/api/workload/summary`

Returns workload distribution information.

### GET `/api/workload/suggestions`

Returns workload redistribution suggestions.

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
