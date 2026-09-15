# DevAlign AI — Complete Business Data Flow

## 1. End-to-End Business Flow Diagram

```
[MANAGER / ADMIN]
       │
       ▼
 1. PROJECT CREATION ────────────► Creates `projects` record
       │
       ▼
 2. TEAM & DEVELOPER SETUP ──────► Creates `teams`, `team_members`, `developer_skills`
       │
       ▼
 3. TASK CREATION ───────────────► Creates `tasks` with priority, complexity, estimated hours
       │                           and `task_skills` (required proficiency levels)
       ▼
 4. TASK WEIGHT CALCULATION ─────► Deterministic TaskWeightService computes `task_weight_score` (1-100)
       │                           Category: LIGHT, MODERATE, HEAVY, CRITICAL
       ▼
 5. RECOMMENDATION ENGINE ───────► Triggers Baseline-v2 (or configured Baseline-v1)
       │                           Evaluates Skill Match (30%), Coverage (15%), Workload (15%),
       │                           Availability (10%), Experience (10%), Performance (10%), Task Fit (10%)
       ▼
 6. TASK ASSIGNMENT ─────────────► Manager selects developer; creates active `assignments` record
       │                           Updates developer active workload & capacity
       ▼
[DEVELOPER LOGIN]
       │
       ▼
 7. MY WORK & TASK DETAIL ───────► Developer views assigned task; clicks "Start Task"
       │                           Status changes from `TODO` to `IN_PROGRESS`
       ▼
 8. EXECUTION TIMER ─────────────► Real-time HH:MM:SS timer tracks execution duration
       │                           Supports Start / Pause / Resume with persistence
       ▼
 9. TASK COMPLETION ─────────────► Developer completes task; records `completed_by` and `completed_at`
       │                           Assignment marked `COMPLETED`
       ▼
10. AUTOMATED SYSTEM UPDATES ────►
       ├─► Relieves Developer Workload (hours freed from active capacity)
       ├─► Calculates Delivery Variance (Actual Seconds vs. Estimated Hours)
       ├─► Evaluates On-Time Delivery (Bonus awarded if completed on or before deadline)
       ├─► Updates Developer Streaks (increments consecutive days streak)
       ├─► Unlocks Achievements (e.g. Heavy Task Specialist, On-Time Champion)
       ├─► Logs Reward Points in `developer_incentive_ledger`
       ├─► Creates `developer_performance_snapshots`
       └─► Updates Real-Time Analytics & Risk Dashboards
```

---

## 2. Relationship & Connection Verification

| Stage Transition | Implemented Status | Verification Method |
|---|---|---|
| **User → Project Creation** | ✅ **CONNECTED** | Verified via `POST /api/projects` & UI form |
| **Project → Team & Members** | ✅ **CONNECTED** | Verified via `POST /api/teams` and `POST /api/teams/{id}/members` |
| **Task → Task Skills** | ✅ **CONNECTED** | Verified via `POST /api/tasks` with skills payload |
| **Task → Task Weight** | ✅ **CONNECTED** | Calculated automatically upon task creation/update |
| **Task → Recommendations** | ✅ **CONNECTED** | Verified via `GET /api/recommendations/tasks/{id}` |
| **Recommendation → Assignment**| ✅ **CONNECTED** | Verified via `POST /api/tasks/{id}/assign` |
| **Assignment → Developer My Work** | ✅ **CONNECTED** | Developer role filter ensures only assigned tasks appear in `/tasks` and `/tasks/{id}` |
| **Task Start → Execution Timer** | ✅ **CONNECTED** | Verified via `POST /api/tasks/{id}/timer/start` and `/timer/stop` |
| **Task Completion → Workload Update** | ✅ **CONNECTED** | Verified in `workload_service.py` (only `ACTIVE` assignments count toward load) |
| **Task Completion → Streaks & Ledger** | ✅ **CONNECTED** | Verified in `performance_service.py` and `tasks.py` |
| **Completion → Project Intelligence** | ✅ **CONNECTED** | Verified in `analytics_service.py` and `/analytics/me` |
