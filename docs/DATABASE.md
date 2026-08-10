# Database Design

## 1. Database

Database engine:

PostgreSQL

The database stores application data required for developer management, task management, assignments, recommendations, and workload analysis.

## 2. Users

Table: `users`

Fields:

* `id`
* `name`
* `email`
* `password_hash`
* `role`
* `is_active`
* `created_at`
* `updated_at`

Roles:

* ADMIN
* MANAGER
* DEVELOPER

## 3. Developer Profiles

Table: `developer_profiles`

Fields:

* `id`
* `user_id`
* `experience_years`
* `availability_status`
* `performance_score`
* `created_at`
* `updated_at`

Relationship:

One user may have one developer profile when the user has the DEVELOPER role.

## 4. Skills

Table: `skills`

Fields:

* `id`
* `name`
* `category`
* `created_at`

Examples:

* Python
* Java
* React
* Next.js
* PostgreSQL
* MongoDB
* Spring Boot

## 5. Developer Skills

Table: `developer_skills`

Fields:

* `id`
* `developer_id`
* `skill_id`
* `proficiency_level`

This table represents the many-to-many relationship between developers and skills.

Example:

```text
Developer A
    Python → 90
    React  → 80
    SQL    → 70
```

## 6. Tasks

Table: `tasks`

Fields:

* `id`
* `title`
* `description`
* `category`
* `priority`
* `complexity`
* `estimated_hours`
* `deadline`
* `status`
* `created_by`
* `created_at`
* `updated_at`

Possible statuses:

* TODO
* IN_PROGRESS
* COMPLETED
* BLOCKED
* CANCELLED

Possible priorities:

* LOW
* MEDIUM
* HIGH
* CRITICAL

Possible complexity:

* LOW
* MEDIUM
* HIGH

## 7. Task Skills

Table: `task_skills`

Fields:

* `id`
* `task_id`
* `skill_id`
* `required_level`

This table represents the skills required to complete a task.

## 8. Assignments

Table: `assignments`

Fields:

* `id`
* `task_id`
* `developer_id`
* `assigned_by`
* `status`
* `assigned_at`
* `completed_at`

This table records actual task assignments.

## 9. Recommendations

Table: `recommendations`

Fields:

* `id`
* `task_id`
* `developer_id`
* `model_version`
* `score`
* `rank`
* `explanation`
* `created_at`

This stores generated recommendations so recommendation history can be analysed.

## 10. Workload Records

Table: `workload_records`

Fields:

* `id`
* `developer_id`
* `workload_score`
* `active_task_count`
* `estimated_hours`
* `calculated_at`

This allows workload history to be retained.

## 11. Relationships

```text
users
  │
  └── developer_profiles
          │
          └── developer_skills ── skills


users
  │
  └── tasks
          │
          └── task_skills ── skills


tasks
  │
  ├── assignments ── developer_profiles
  │
  └── recommendations ── developer_profiles


developer_profiles
  │
  └── workload_records
```

## 12. Important Rules

Passwords must never be stored in plain text.

Foreign key relationships must be enforced.

Deleted records should not break historical recommendations or assignments.

Historical recommendation records should retain the model version used.

Database changes must use migrations.

## 13. ML Data

ML training data may be generated from historical assignments and prepared datasets.

Training datasets should not be treated as the primary transactional database.

ML datasets should be stored separately from production application tables.
