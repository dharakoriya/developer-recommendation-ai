# COMPLETE DEVAlign FEATURE INVENTORY — System Feature Truth Matrix

This matrix documents all 24 discovered features in DevAlign AI, detailing their location, API endpoints, database tables, business services, configuration requirements, and operational statuses.

---

## Master Feature Inventory Table

| Feature Name | Frontend Location | Backend API Endpoint | Database Tables | Allowed Roles | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Authentication & JWT Sessions** | `/login` | `POST /api/auth/login`, `GET /api/auth/me` | `users` | All Users | ✅ WORKING |
| **2. Role-Based Access Control (RBAC)** | All UI Routes | `app/api/deps.py` (`require_roles`) | `users.role` | Admin, Manager, Developer | ✅ WORKING |
| **3. Projects Catalog & Management** | `/projects` | `GET/POST /api/projects` | `projects` | Admin, Manager (Dev read-only) | ✅ WORKING |
| **4. Project Details & Kanban Board** | `/projects/[id]` | `GET /api/projects/{id}` | `projects`, `tasks`, `teams` | Admin, Manager (Dev read-only) | ✅ WORKING |
| **5. Teams & Member Association** | `/teams` | `GET/POST /api/teams` | `teams`, `developer_profiles` | Admin, Manager (Dev read-only) | ✅ WORKING |
| **6. Tasks Management & Project Bifurcation** | `/tasks` | `GET/POST /api/tasks` | `tasks`, `projects` | Admin, Manager (Dev read-only) | ✅ WORKING |
| **7. Task Skill Requirements** | `/tasks/[id]` | `POST /api/tasks/{id}/skills` | `task_skills`, `skills` | Admin, Manager | ✅ WORKING |
| **8. Task Weight Score Calculation** | System Service | `app/services/task_weight_service.py` | `tasks.task_weight_score` | Automated / System | ✅ WORKING |
| **9. Developers Directory & Filtering** | `/developers` | `GET /api/developers` | `developer_profiles`, `skills` | All Users | ✅ WORKING |
| **10. Developer Skills & Proficiency** | `/developers/[id]` | `POST /api/developers/{id}/skills` | `developer_skills` | Admin, Manager | ✅ WORKING |
| **11. Workload Engine & Utilization** | `/workload` | `GET /api/workload`, `/api/dashboard/workload` | `workload_records` | All Users | ✅ WORKING |
| **12. Recommendation Engine (`baseline-v2`)**| `/recommendations` | `POST /api/recommendations/recommend` | `recommendations`, `audits` | Admin, Manager | ✅ WORKING |
| **13. Candidate Explanation & Scoring** | `/recommendations` | `app/services/recommendation_service.py` | `recommendations` | Admin, Manager | ✅ WORKING |
| **14. Developer Assignment Execution** | `/recommendations` | `POST /api/recommendations/assign` | `assignments`, `tasks` | Admin, Manager | ✅ WORKING |
| **15. Task Completion & Workflow** | `/protected` | `PUT /api/tasks/{id}` | `tasks`, `assignments` | Admin, Manager, Assigned Dev | ✅ WORKING |
| **16. Developer Performance Engine** | `/dashboard` | `app/services/performance_service.py` | `performance_snapshots` | All Users | ✅ WORKING |
| **17. Streaks & Achievement Badges** | `/dashboard` | `app/models/performance.py` | `developer_streaks`, `achievements` | All Users | ✅ WORKING |
| **18. Incentive Ledger & Points** | `/dashboard` | `app/models/performance.py` | `developer_incentive_ledger` | All Users | ✅ WORKING |
| **19. Multi-Provider AI Project Planner** | `/ai-planning` | `POST /api/ai-planning/plans` | `ai_plan_drafts`, `tasks` | Admin, Manager | ✅ WORKING |
| **20. Risk & Delivery Intelligence** | `/analytics` | `GET /api/risk/projects/{id}` | `tasks`, `projects`, `workload` | Admin, Manager | ✅ WORKING |
| **21. Research Feature Engineering Dataset** | `/research` | `/api/features/metadata` | `feature_metadata` | Admin, Manager | 📚 RESEARCH ONLY |
| **22. Research ML Pipeline & Training** | `/research/pipeline` | `research/ml/train.py` | `research/data/` CSV files | Admin, Manager | 📚 RESEARCH ONLY |
| **23. SHAP Explainability Dashboard** | `/research/shap` | `research/ml/explainability/` | `shap_global_importance.json` | Admin, Manager | 📚 RESEARCH ONLY |
| **24. Light / Dark Theme Switcher** | Global Header | `frontend/context/ThemeContext.tsx` | Local Storage | All Users | ✅ WORKING |
