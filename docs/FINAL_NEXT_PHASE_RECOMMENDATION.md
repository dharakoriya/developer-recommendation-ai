# DevAlign AI — Next-Phase Roadmap & Prioritized Recommendations

## 1. Prioritization Framework

To ensure DevAlign AI remains robust, elegant, and perfectly aligned with project evaluation standards, recommendations are categorized into four clear priorities:

- **PHASE A: MUST DO (Critical for Final Viva & Demonstration)**
- **PHASE B: SHOULD DO (Enhances Polish and User Experience)**
- **PHASE C: NICE TO HAVE (Future Engineering Improvements)**
- **PHASE D: DO NOT DO (Anti-Patterns / Unnecessary Over-Engineering)**

---

## 2. Detailed Roadmap

### PHASE A — MUST DO (Viva & Demo Readiness)
1. **Model Switch Demonstration**:
   - Verify demonstrating Baseline-v2 vs Baseline-v1 by toggling `RECOMMENDATION_MODEL` in `.env` or showing query param comparison.
   - *Impact*: Demonstrates deep understanding of algorithmic evolution and auditability during Viva.
2. **End-to-End Live Task Execution Demo**:
   - Create project → Create tasks → Run Find Best Developer → Assign → Developer Login → Start Task → Live Timer (HH:MM:SS) → Complete → Verify points, streaks, workload relief, and personal analytics.
   - *Impact*: Proves full-stack data integrity across roles.
3. **AI Planning Offline Fallback**:
   - Keep default `AI_PROVIDER=heuristic` so AI Project Planner generates full WBS plans reliably without needing internet or an OpenAI API key during presentation.

---

### PHASE B — SHOULD DO (Polish & Usability)
1. **Interactive Team Filtering in Project Views**:
   - Allow filtering the Tasks page by assigned Team in addition to Project and Status.
   - *Complexity*: Low | *Files*: `frontend/app/tasks/page.tsx`, `backend/app/api/tasks.py`.
2. **Export Personal Work Summary**:
   - Provide a simple "Export My Work Report (JSON / CSV)" button on `/analytics/me` for developer self-reporting.
   - *Complexity*: Low | *Files*: `frontend/app/analytics/me/page.tsx`.

---

### PHASE C — NICE TO HAVE (Future Scope)
1. **Team Lead / Manager Assignment on Team Entity**:
   - Add explicit `manager_id` foreign key on the `teams` table if sub-team delegation is desired in enterprise deployments.
2. **Real-Time WebSocket Timer Sync**:
   - Broadcast live timer ticks across concurrent manager/developer browser tabs.

---

### PHASE D — DO NOT DO (Avoid Over-Engineering)
1. ❌ **Do NOT replace deterministic Baseline-v2 with black-box neural networks in production**:
   - Enterprise task assignment requires 100% explainable mathematical rules and strict capacity constraints.
2. ❌ **Do NOT introduce microservices or complex message brokers (Kafka/RabbitMQ)**:
   - DevAlign AI's unified FastAPI architecture provides sub-50ms query times and clean maintainability.
3. ❌ **Do NOT place core calculation formulas inside `.env` files**:
   - Keep business logic in source code with unit tests; `.env` should only govern environment switches (such as model version and AI provider).
