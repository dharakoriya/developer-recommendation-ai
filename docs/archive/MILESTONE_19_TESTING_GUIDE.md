# DevAlign AI — Milestone 19 Testing Guide

This guide provides step-by-step verification instructions for testing Task Weighting, Developer Performance Intelligence, Streaks, Achievements, Incentives, Filtering, and `baseline-v1.1` recommendations.

---

## 1. Automated Verification Suite

### Backend Pytest Suite
Run the full backend test suite:
```bash
backend/venv/Scripts/python.exe -m pytest backend/tests/
```
Expected result: **All tests pass (100% pass rate)**.

### Frontend TypeScript Verification
Run TypeScript type-checking:
```bash
cd frontend && npx tsc --noEmit
```
Expected result: **0 errors**.

---

## 2. Seed Controlled Demo Data

Reset local development database and populate seed dataset:
```bash
backend/venv/Scripts/python.exe backend/scripts/seed_demo_data.py
```
Output confirms:
- 4 Developers (Alice, Rahul, Priya, David) with varied performance metrics
- 6 Tasks with calculated Task Weight Scores
- Streaks, Achievements, and Incentive Ledgers generated

---

## 3. Role-Based Access Control (RBAC) & Interactive Testing

### Test Scenario A: Developer View (Alice - `alice@devalign.ai`)
1. Login as `alice@devalign.ai` (Password: `dev123`).
2. Navigate to `/developers/{alice_id}/performance`.
3. Verify:
   - Composite Performance Score & Badge displayed
   - Active Streak flame counter displayed
   - Unlocked Achievements showcase displayed
   - Incentive points balance & ledger log visible
4. Try accessing another developer's private performance profile:
   - System strictly blocks with HTTP 403 Forbidden.

### Test Scenario B: Manager View (`manager@devalign.ai`)
1. Login as `manager@devalign.ai` (Password: `manager123`).
2. Navigate to `/analytics/performance`.
3. Verify:
   - Team Performance Ranking Leaderboard
   - Top Productivity Leaders & Streak Champions
   - Task Difficulty Distribution chart
   - Direct link to inspect any developer's performance profile.
4. Navigate to `/recommendations`:
   - Toggle model version (`baseline-v1` vs `baseline-v1.1`).
   - Apply performance filters (e.g. `Performance Score > 80`, `Streak >= 3`).
   - Confirm candidate list updates deterministically.
