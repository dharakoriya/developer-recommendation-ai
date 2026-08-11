# Database Design

## 1. Database Overview

Database engine:

**PostgreSQL**

The database is the primary source of truth for application data.

The design supports:

* Multiple projects
* Multiple teams within projects
* Developers participating in multiple teams/projects
* Developer skills and proficiency
* Task management
* Task assignments
* Permanent assignment history
* AI recommendations
* Workload tracking
* ML-related historical data

The database should remain simple enough for rapid development while supporting the project's research requirements.

---

# 2. Entity Relationship Overview

```text
users
  │
  ├── developer_profiles
  │       │
  │       ├── developer_skills ─── skills
  │       │
  │       ├── team_members ─── teams ─── projects
  │       │
  │       ├── assignments
  │       │
  │       └── workload_records
  │
  └── projects
          │
          └── teams
                │
                └── team_members

projects
  │
  └── tasks
        │
        ├── task_skills ─── skills
        │
        ├── assignments ─── developer_profiles
        │
        └── recommendations ─── developer_profiles
                                      │
                                      └── recommendation_explanations
```

---

# 3. Users

Table:

`users`

Purpose:

Stores authentication and account information for all system users.

### Fields

| Field           | Type         | Required | Description               |
| --------------- | ------------ | -------: | ------------------------- |
| `id`            | UUID         |      Yes | Primary key               |
| `name`          | VARCHAR(150) |      Yes | User's name               |
| `email`         | VARCHAR(255) |      Yes | Unique login email        |
| `password_hash` | TEXT         |      Yes | Securely hashed password  |
| `role`          | ENUM         |      Yes | ADMIN, MANAGER, DEVELOPER |
| `is_active`     | BOOLEAN      |      Yes | Account status            |
| `created_at`    | TIMESTAMP    |      Yes | Creation time             |
| `updated_at`    | TIMESTAMP    |      Yes | Last update               |

### Constraints

* `email` must be unique.
* Passwords must never be stored in plain text.
* `role` must contain a valid supported role.
* Inactive users cannot authenticate.

---

# 4. Developer Profiles

Table:

`developer_profiles`

Purpose:

Stores professional information used by the application and recommendation engine.

### Fields

| Field                 | Type         | Required | Description                     |
| --------------------- | ------------ | -------: | ------------------------------- |
| `id`                  | UUID         |      Yes | Primary key                     |
| `user_id`             | UUID         |      Yes | FK → users.id                   |
| `experience_years`    | DECIMAL(4,1) |      Yes | Years of experience             |
| `availability_status` | ENUM         |      Yes | AVAILABLE, PARTIAL, UNAVAILABLE |
| `performance_score`   | DECIMAL(5,2) |       No | Historical performance score    |
| `created_at`          | TIMESTAMP    |      Yes | Creation time                   |
| `updated_at`          | TIMESTAMP    |      Yes | Last update                     |

### Important Rule

Do **not** store `current_workload` here.

Current workload should be calculated from actual assignments and task effort.

This prevents inconsistent workload information.

---

# 5. Skills

Table:

`skills`

Purpose:

Stores the master list of technical skills and technologies.

### Fields

| Field        | Type         | Required | Description    |
| ------------ | ------------ | -------: | -------------- |
| `id`         | UUID         |      Yes | Primary key    |
| `name`       | VARCHAR(100) |      Yes | Skill name     |
| `category`   | VARCHAR(100) |       No | Skill category |
| `created_at` | TIMESTAMP    |      Yes | Creation time  |

### Examples

```text
Python
Java
JavaScript
TypeScript
React
Next.js
FastAPI
Spring Boot
PostgreSQL
MongoDB
Docker
```

### Constraints

`name` should be unique.

---

# 6. Developer Skills

Table:

`developer_skills`

Purpose:

Creates the many-to-many relationship between developers and skills.

### Fields

| Field               | Type         | Required | Description                |
| ------------------- | ------------ | -------: | -------------------------- |
| `id`                | UUID         |      Yes | Primary key                |
| `developer_id`      | UUID         |      Yes | FK → developer_profiles.id |
| `skill_id`          | UUID         |      Yes | FK → skills.id             |
| `proficiency_level` | DECIMAL(5,2) |      Yes | Skill proficiency          |
| `created_at`        | TIMESTAMP    |      Yes | Creation time              |
| `updated_at`        | TIMESTAMP    |      Yes | Last update                |

### Proficiency

Use a normalized range:

```text
0   = No proficiency
100 = Expert
```

Example:

```text
John
Python → 90
React  → 80
SQL    → 70
```

### Constraints

The combination of:

```text
developer_id + skill_id
```

must be unique.

---

# 7. Projects

Table:

`projects`

Purpose:

Allows the system to support multiple software projects.

### Fields

| Field         | Type         | Required | Description                 |
| ------------- | ------------ | -------: | --------------------------- |
| `id`          | UUID         |      Yes | Primary key                 |
| `name`        | VARCHAR(200) |      Yes | Project name                |
| `description` | TEXT         |       No | Project description         |
| `status`      | ENUM         |      Yes | ACTIVE, COMPLETED, ARCHIVED |
| `created_by`  | UUID         |      Yes | FK → users.id               |
| `created_at`  | TIMESTAMP    |      Yes | Creation time               |
| `updated_at`  | TIMESTAMP    |      Yes | Last update                 |

---

# 8. Teams

Table:

`teams`

Purpose:

Groups developers working within a project.

### Fields

| Field         | Type         | Required | Description      |
| ------------- | ------------ | -------: | ---------------- |
| `id`          | UUID         |      Yes | Primary key      |
| `project_id`  | UUID         |      Yes | FK → projects.id |
| `name`        | VARCHAR(150) |      Yes | Team name        |
| `description` | TEXT         |       No | Team description |
| `created_at`  | TIMESTAMP    |      Yes | Creation time    |
| `updated_at`  | TIMESTAMP    |      Yes | Last update      |

### Relationship

One project can contain multiple teams.

Example:

```text
Project A
 ├── Frontend Team
 ├── Backend Team
 └── QA Team
```

---

# 9. Team Members

Table:

`team_members`

Purpose:

Allows developers to participate in multiple teams.

### Fields

| Field          | Type      | Required | Description                |
| -------------- | --------- | -------: | -------------------------- |
| `id`           | UUID      |      Yes | Primary key                |
| `team_id`      | UUID      |      Yes | FK → teams.id              |
| `developer_id` | UUID      |      Yes | FK → developer_profiles.id |
| `joined_at`    | TIMESTAMP |      Yes | Membership start           |
| `left_at`      | TIMESTAMP |       No | Membership end             |

### Important Rule

A developer can belong to multiple teams.

Example:

```text
John
 ├── Project A / Frontend Team
 └── Project B / Backend Team
```

Historical team membership should not be deleted unnecessarily.

---

# 10. Tasks

Table:

`tasks`

Purpose:

Stores software development tasks that require developer recommendations.

### Fields

| Field             | Type         | Required | Description                                      |
| ----------------- | ------------ | -------: | ------------------------------------------------ |
| `id`              | UUID         |      Yes | Primary key                                      |
| `project_id`      | UUID         |      Yes | FK → projects.id                                 |
| `team_id`         | UUID         |       No | FK → teams.id                                    |
| `title`           | VARCHAR(255) |      Yes | Task title                                       |
| `description`     | TEXT         |       No | Task details                                     |
| `category`        | VARCHAR(100) |       No | Task category                                    |
| `priority`        | ENUM         |      Yes | LOW, MEDIUM, HIGH, CRITICAL                      |
| `complexity`      | ENUM         |      Yes | LOW, MEDIUM, HIGH                                |
| `estimated_hours` | DECIMAL(6,2) |      Yes | Estimated effort                                 |
| `deadline`        | TIMESTAMP    |       No | Task deadline                                    |
| `status`          | ENUM         |      Yes | TODO, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED |
| `created_by`      | UUID         |      Yes | FK → users.id                                    |
| `created_at`      | TIMESTAMP    |      Yes | Creation time                                    |
| `updated_at`      | TIMESTAMP    |      Yes | Last update                                      |

### Important Rules

* Every task belongs to a project.
* A task may optionally belong to a team.
* Estimated hours must be greater than zero.
* A completed task should retain its assignment history.

---

# 11. Task Skills

Table:

`task_skills`

Purpose:

Stores the skills required by each task.

### Fields

| Field            | Type         | Required | Description          |
| ---------------- | ------------ | -------: | -------------------- |
| `id`             | UUID         |      Yes | Primary key          |
| `task_id`        | UUID         |      Yes | FK → tasks.id        |
| `skill_id`       | UUID         |      Yes | FK → skills.id       |
| `required_level` | DECIMAL(5,2) |      Yes | Required proficiency |
| `created_at`     | TIMESTAMP    |      Yes | Creation time        |

### Example

```text
Task: Build payment API

Python → 80
FastAPI → 75
PostgreSQL → 70
```

### Constraints

The combination:

```text
task_id + skill_id
```

must be unique.

---

# 12. Assignments

Table:

`assignments`

Purpose:

Stores the actual assignment history.

This table is extremely important for both application functionality and future ML data.

### Fields

| Field           | Type      | Required | Description                              |
| --------------- | --------- | -------: | ---------------------------------------- |
| `id`            | UUID      |      Yes | Primary key                              |
| `task_id`       | UUID      |      Yes | FK → tasks.id                            |
| `developer_id`  | UUID      |      Yes | FK → developer_profiles.id               |
| `assigned_by`   | UUID      |      Yes | FK → users.id                            |
| `status`        | ENUM      |      Yes | ACTIVE, COMPLETED, REASSIGNED, CANCELLED |
| `assigned_at`   | TIMESTAMP |      Yes | Assignment time                          |
| `completed_at`  | TIMESTAMP |       No | Completion time                          |
| `reassigned_at` | TIMESTAMP |       No | Reassignment time                        |
| `notes`         | TEXT      |       No | Assignment notes                         |

### Important Rule

Assignment records are **historical records**.

Do not delete an old assignment simply because a task was reassigned.

Example:

```text
Task #101

Assignment 1
John
REASSIGNED

Assignment 2
Sarah
REASSIGNED

Assignment 3
Alex
COMPLETED
```

This history may later help create ML training data.

---

# 13. Recommendations

Table:

`recommendations`

Purpose:

Stores ML-generated developer recommendations.

### Fields

| Field           | Type         | Required | Description                |
| --------------- | ------------ | -------: | -------------------------- |
| `id`            | UUID         |      Yes | Primary key                |
| `task_id`       | UUID         |      Yes | FK → tasks.id              |
| `developer_id`  | UUID         |      Yes | FK → developer_profiles.id |
| `model_version` | VARCHAR(50)  |      Yes | ML model version           |
| `score`         | DECIMAL(7,6) |      Yes | Recommendation score       |
| `rank`          | INTEGER      |      Yes | Recommendation rank        |
| `created_at`    | TIMESTAMP    |      Yes | Recommendation time        |

### Example

```text
Task #101

1. John   0.923400
2. Sarah  0.841200
3. Alex   0.764500
```

---

# 14. Recommendation Explanations

Table:

`recommendation_explanations`

Purpose:

Stores structured explanation data generated by SHAP.

### Fields

| Field               | Type          | Required | Description             |
| ------------------- | ------------- | -------: | ----------------------- |
| `id`                | UUID          |      Yes | Primary key             |
| `recommendation_id` | UUID          |      Yes | FK → recommendations.id |
| `feature_name`      | VARCHAR(100)  |      Yes | Feature used by model   |
| `feature_value`     | TEXT          |       No | Value used              |
| `shap_value`        | DECIMAL(12,8) |      Yes | SHAP contribution       |
| `direction`         | ENUM          |      Yes | POSITIVE or NEGATIVE    |
| `created_at`        | TIMESTAMP     |      Yes | Creation time           |

### Example

```text
Recommendation: John

skill_match
value = 92%
SHAP = +0.31

experience
value = 6 years
SHAP = +0.22

availability
value = 80%
SHAP = +0.15

workload
value = 75%
SHAP = -0.08
```

This allows the UI to generate human-readable explanations without depending entirely on an unstructured text field.

---

# 15. Workload Records

Table:

`workload_records`

Purpose:

Stores workload snapshots for historical analysis.

### Fields

| Field                 | Type         | Required | Description                |
| --------------------- | ------------ | -------: | -------------------------- |
| `id`                  | UUID         |      Yes | Primary key                |
| `developer_id`        | UUID         |      Yes | FK → developer_profiles.id |
| `workload_score`      | DECIMAL(7,2) |      Yes | Calculated workload        |
| `active_task_count`   | INTEGER      |      Yes | Active task count          |
| `estimated_hours`     | DECIMAL(8,2) |      Yes | Active estimated hours     |
| `availability_factor` | DECIMAL(5,2) |       No | Availability consideration |
| `calculated_at`       | TIMESTAMP    |      Yes | Calculation time           |

### Important Rule

This table is a **historical snapshot**.

It is not the source of truth for current workload.

Current workload should be calculated from:

```text
Developer
+
Active Assignments
+
Task Estimated Hours
+
Task Complexity
+
Deadline
+
Availability
```

---

# 16. Workload Calculation

The proposal describes workload using task number, complexity, estimated hours, and deadline pressure.

The application will initially use these concepts to calculate a normalized workload score.

Conceptually:

```text
Workload Score =
Task Load
+
Effort Load
+
Complexity Load
+
Deadline Pressure
```

The exact weights must be finalized during implementation/testing rather than hard-coded into the database.

Example:

```text
Developer A

Active tasks:      4
Estimated hours:   32
Complexity:        High
Deadline pressure: Medium

→ Workload Score: 78%
```

---

# 17. ML-Relevant Data

The following database information can contribute to ML features:

### Developer

* Skills
* Proficiency
* Experience
* Performance
* Availability
* Current workload
* Previous assignments

### Task

* Required skills
* Required proficiency
* Category
* Complexity
* Priority
* Estimated hours
* Deadline

### Historical Data

* Previous assignments
* Assignment outcomes
* Completion information
* Reassignment history
* Performance information

The final feature set will be defined in `AI_MODEL.md` and should not be changed casually during implementation.

---

# 18. Database Relationships

### User → Developer Profile

```text
users 1 ─── 0..1 developer_profiles
```

### Project → Teams

```text
projects 1 ─── N teams
```

### Team ↔ Developers

```text
teams N ─── N developer_profiles
```

through:

`team_members`

### Developer ↔ Skills

```text
developer_profiles N ─── N skills
```

through:

`developer_skills`

### Project → Tasks

```text
projects 1 ─── N tasks
```

### Task ↔ Skills

```text
tasks N ─── N skills
```

through:

`task_skills`

### Task → Assignments

```text
tasks 1 ─── N assignments
```

### Developer → Assignments

```text
developer_profiles 1 ─── N assignments
```

### Task → Recommendations

```text
tasks 1 ─── N recommendations
```

### Recommendation → Explanations

```text
recommendations 1 ─── N recommendation_explanations
```

### Developer → Workload Records

```text
developer_profiles 1 ─── N workload_records
```

---

# 19. Indexing Strategy

Indexes should initially be created for:

```text
users.email

developer_profiles.user_id

developer_skills.developer_id
developer_skills.skill_id

projects.created_by

teams.project_id

team_members.team_id
team_members.developer_id

tasks.project_id
tasks.team_id
tasks.status
tasks.deadline

task_skills.task_id
task_skills.skill_id

assignments.task_id
assignments.developer_id
assignments.status

recommendations.task_id
recommendations.developer_id

recommendation_explanations.recommendation_id

workload_records.developer_id
workload_records.calculated_at
```

Indexes should be added based on actual query patterns and should not be created blindly for every column.

---

# 20. Data Integrity Rules

The database must enforce:

* Unique user emails.
* Unique skill names.
* Unique developer-skill combinations.
* Unique task-skill combinations.
* Valid foreign-key relationships.
* Valid enum values.
* Positive estimated task hours.
* Proficiency between 0 and 100.
* Appropriate workload values.
* Historical assignments must not be silently deleted.

---

# 21. Delete Strategy

Avoid hard deletion for records that are important to historical analysis.

Prefer deactivation/archive behavior for:

* Users
* Developers
* Skills
* Projects
* Teams

Tasks and assignments should preserve historical information whenever possible.

This is important because historical assignments may later contribute to ML training/evaluation.

---

# 22. Migration Strategy

All schema changes must be performed through database migrations.

Do not manually alter the production database.

Every migration should:

1. Have a clear name.
2. Be committed to Git.
3. Be reversible where practical.
4. Be tested before deployment.

---

# 23. Database Source of Truth

The database is the source of truth for:

* Users
* Developers
* Skills
* Projects
* Teams
* Tasks
* Assignments

Calculated information such as current workload should be derived from source data.

ML predictions are not the source of truth for actual assignments.

Actual assignments are recorded separately in `assignments`.

---

# 24. Design Principle

The database is intentionally designed to support the project's core goal without becoming a full enterprise project-management database.

The priority is:

1. Correct relationships
2. Historical assignment data
3. ML-ready information
4. Workload calculation
5. Simple implementation
6. Future extensibility
