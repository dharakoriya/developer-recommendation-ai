# DEVAlign FINAL TEST CHECKLIST — Practical Verification Checklist

This checkbox checklist allows rapid manual verification of all DevAlign AI features.

---

## 1. Environment & Infrastructure Check
- [x] **PostgreSQL Service**: Running on port `5432` (`devalign_db`).
- [x] **FastAPI Backend**: Running on `http://localhost:8000`. Health check `GET /api/health` returns `200 OK`.
- [x] **Next.js Frontend**: Running on `http://localhost:3000`. Login page loads cleanly.

---

## 2. Authentication & Role Security Check
- [x] **Developer Login**: Log in as `dev.rahul@devalign.ai`. Verify developer dashboard metrics load.
- [x] **Forbidden Route Protection**: Navigate to `/projects/new` as Developer. Verify HTTP 403 Forbidden screen appears.
- [x] **Sign Out Navigation**: Click Sign out in header. Verify info toast appears and browser redirects to `/login`.
- [x] **Manager Login**: Log in as `manager@devalign.ai`. Verify manager operational dashboard loads.

---

## 3. Project & Task Governance Check
- [x] **Project Creation**: Create project `Payment Modernization`. Verify card renders in grid.
- [x] **Task Creation & Project Bifurcation**: Create task under `Payment Modernization`. Verify task displays project badge `📁 Payment Modernization`.
- [x] **Grouped View Toggle**: Toggle to **Group by Project View** on `/tasks`. Verify tasks organize under project cards.

---

## 4. Recommendation, Workload & Incentive Check
- [x] **Recommendation Ranking**: Open `/recommendations`, select task. Verify Candidate #1 score breakdown.
- [x] **Hard Capacity Filtering**: Verify overloaded developers ($>100\%$) are excluded from recommendations.
- [x] **Assignment Execution**: Click Assign Developer. Confirm assignment status updates to `ALLOCATED`.
- [x] **Workload Capacity**: Open `/workload`. Verify workload distribution chart updates in real-time.
- [x] **Developer Portal**: Log in as Developer. Verify assigned task, streaks, achievements, and incentive points ledger.

---

## 5. AI Planning & Research ML Check
- [x] **AI Project Planner**: Open `/ai-planning`. Submit natural language specs. Click Approve Plan. Verify project/tasks seed DB.
- [x] **SHAP Explainability**: Open `/research/shap`. Verify global feature importance plot renders cleanly.
- [x] **Theme System**: Toggle Light / Dark mode in header. Verify text contrast across cards, tables, and modals.
