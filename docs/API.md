# REST API Specification

This document details the RESTful API endpoints for **Project Dhara**, hosted by the FastAPI backend engine at `/api/v1`.

---

## 1. Overview & Response Formats

- **Base URL**: `http://localhost:8000/api/v1`
- **Content-Type**: `application/json`
- **Error Format**:
```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 'DHARA-102' does not exist.",
    "status": 404
  }
}
```

---

## 2. API Endpoint Reference

### 2.1 Developers API

#### `GET /api/v1/developers`
Fetch list of active developers with current workload capacity scores.

**Response Schema (`200 OK`)**:
```json
[
  {
    "id": "c39e4a8b-1234-4567-89ab-cdef01234567",
    "dev_code": "DEV-101",
    "name": "Sarah Connor",
    "experience_years": 5.5,
    "current_capacity_score": 45.0,
    "max_weekly_hours": 40,
    "skills": [
      {"name": "Python", "proficiency": 0.95},
      {"name": "FastAPI", "proficiency": 0.90},
      {"name": "PostgreSQL", "proficiency": 0.80}
    ],
    "is_active": true
  }
]
```

---

### 2.2 Tasks API

#### `POST /api/v1/tasks`
Create a new backlog task requiring developer allocation.

**Request Payload**:
```json
{
  "task_key": "DHARA-204",
  "title": "Implement SHAP Waterfall Component",
  "description": "Build reactive React component to display SHAP feature attributions.",
  "category": "Feature",
  "priority": "High",
  "complexity_rating": 4,
  "estimated_hours": 12.0,
  "required_skills": ["React", "TypeScript", "D3.js"]
}
```

---

### 2.3 AI Recommendation & XAI API

#### `GET /api/v1/recommendations/tasks/{task_id}`
Generates ranked list of suitable developers with confidence scores and capacity warnings.

**Response Schema (`200 OK`)**:
```json
{
  "task_id": "DHARA-204",
  "generated_at": "2026-08-04T16:25:34Z",
  "recommendations": [
    {
      "rank": 1,
      "developer_id": "c39e4a8b-1234-4567-89ab-cdef01234567",
      "dev_code": "DEV-101",
      "name": "Sarah Connor",
      "suitability_score": 92.5,
      "current_capacity": 45.0,
      "capacity_warning": false,
      "top_drivers": [
        {"feature": "React Skill Match", "impact": "+35.0%"},
        {"feature": "Similar Completed Tasks", "impact": "+25.0%"},
        {"feature": "Available Capacity", "impact": "+15.0%"}
      ]
    },
    {
      "rank": 2,
      "developer_id": "d40f5b9c-2345-5678-90bc-defa12345678",
      "dev_code": "DEV-102",
      "name": "John Doe",
      "suitability_score": 78.0,
      "current_capacity": 85.0,
      "capacity_warning": true,
      "warning_message": "Developer workload is high (85%). Consider redistribution.",
      "top_drivers": [
        {"feature": "TypeScript Skill Match", "impact": "+30.0%"},
        {"feature": "Workload Overload Penalty", "impact": "-20.0%"}
      ]
    }
  ]
}
```

#### `GET /api/v1/xai/explain/task/{task_id}/developer/{dev_id}`
Returns complete granular SHAP waterfall attributions and contrastive LIME explanation text.

**Response Schema (`200 OK`)**:
```json
{
  "task_id": "DHARA-204",
  "developer_id": "c39e4a8b-1234-4567-89ab-cdef01234567",
  "base_value": 50.0,
  "final_score": 92.5,
  "shap_waterfall": [
    {"feature": "Skill Match (React)", "value": 0.90, "shap_impact": 22.5},
    {"feature": "Skill Match (TypeScript)", "value": 0.85, "shap_impact": 12.5},
    {"feature": "Historic Velocity", "value": 0.88, "shap_impact": 10.0},
    {"feature": "Workload Penalty", "value": 0.45, "shap_impact": -2.5}
  ],
  "lime_text_explanation": "Sarah Connor is recommended with 92.5% confidence primarily because of high proficiency in React (0.90) and TypeScript (0.85), combined with low current workload (45%)."
}
```

---

### 2.4 Workload Balancing API

#### `GET /api/v1/workload/rebalance-suggestions`
Scans team workload variance and suggests task redistributions from overloaded developers ($Workload > 80\%$) to underutilized developers.

**Response Schema (`200 OK`)**:
```json
{
  "team_workload_variance": 34.2,
  "overloaded_developers_count": 1,
  "suggestions": [
    {
      "task_id": "DHARA-198",
      "task_title": "Optimize PostgreSQL Indexes",
      "from_developer": {"dev_code": "DEV-102", "name": "John Doe", "workload_before": 88.0},
      "to_developer": {"dev_code": "DEV-103", "name": "Alex Smith", "workload_before": 35.0},
      "projected_workload_after": {
        "john_doe": 68.0,
        "alex_smith": 55.0
      },
      "suitability_match": 88.0,
      "reason": "John Doe is overloaded (88%). Alex Smith has matching Database skills and ample capacity (35%)."
    }
  ]
}
```

---

### 2.5 Task Allocation API

#### `POST /api/v1/allocations`
Confirms assignment of a backlog task to a developer.

**Request Payload**:
```json
{
  "task_id": "DHARA-204",
  "developer_id": "c39e4a8b-1234-4567-89ab-cdef01234567",
  "assigned_by": "project_manager_1"
}
```
