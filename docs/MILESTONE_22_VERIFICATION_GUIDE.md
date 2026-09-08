# Milestone 22 Runtime & Test Verification Guide

## Executive Summary

Milestone 22 successfully upgrades DevAlign AI's active recommendation engine to **`baseline-v2`**, introducing 7-factor transparent compatibility scoring, hard eligibility rules (`ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, `INELIGIBLE`), anti-monopoly workload balancing, task weight compatibility matching, automatic freshness invalidation, strict RBAC enforcement (`403 Forbidden` for Developer role), and a premium Next.js UI redesign for `/recommendations`.

---

## Verification Steps & Commands

### 1. Automated Backend Test Suite Execution

Run the complete Pytest suite including `test_milestone22_recommendation_v2.py`:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest
```

**Expected Result**: All 119 backend tests pass with 0 errors and 0 failures.

### 2. Frontend TypeScript Compilation

Verify TypeScript static type correctness for all Next.js components and pages:

```bash
cd frontend
npx tsc --noEmit
```

**Expected Result**: 0 TypeScript compilation errors.

### 3. API Verification Steps (`baseline-v2`)

#### A. Fetch Recommendations as Admin / Manager
```http
GET /api/recommendations/tasks/{task_id}
Authorization: Bearer <MANAGER_JWT_TOKEN>
```
**Response**:
- Status: `200 OK`
- Body includes `model_version: "baseline-v2"`, `freshness_status: "FRESH"`, `recommendations` list (eligible/conditionally eligible), and `excluded_recommendations` list (ineligible candidates with exclusion reasons).

#### B. Verify RBAC Restriction for Developer Role
```http
GET /api/recommendations/tasks/{task_id}
Authorization: Bearer <DEVELOPER_JWT_TOKEN>
```
**Response**:
- Status: `403 Forbidden`
- Detail: `"Access forbidden. Recommendation engine features are restricted to Admin and Manager roles."`

#### C. Invalidation Trigger Verification
1. Fetch recommendations for a task (`freshness_status: "FRESH"`).
2. Update task priority or required skills via `PUT /api/tasks/{task_id}` or `POST /api/tasks/{task_id}/skills`.
3. Fetch recommendations again: system automatically detects staleness (`is_stale = True`), recalculates 7-factor scores via `baseline-v2`, updates persisted recommendations, and returns updated recommendations.

---

## Key Artifacts & Reference Code

- **Compatibility Scoring Service**: [`backend/app/services/task_developer_compatibility_service.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/app/services/task_developer_compatibility_service.py)
- **Recommendation Service (`baseline-v2`)**: [`backend/app/services/recommendation_service.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/app/services/recommendation_service.py)
- **Recommendation API Endpoint**: [`backend/app/api/recommendations.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/app/api/recommendations.py)
- **Frontend Recommendation Hub**: [`frontend/app/recommendations/page.tsx`](file:///d:/Custom%20Project/dhara/devalign-ai/frontend/app/recommendations/page.tsx)
- **Recommendation Card Component**: [`frontend/components/RecommendationCard.tsx`](file:///d:/Custom%20Project/dhara/devalign-ai/frontend/components/RecommendationCard.tsx)
- **Pytest Test Suite**: [`backend/tests/test_milestone22_recommendation_v2.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/tests/test_milestone22_recommendation_v2.py)
