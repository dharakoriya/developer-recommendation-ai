# DevAlign AI — System Architecture Specification

## 1. High-Level Architectural Overview

DevAlign AI is structured as a full-stack, AI-assisted decision-support platform designed for software engineering resource allocation and workload balancing.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│           Next.js 14 App Router • React • Tailwind CSS                 │
│   (Dashboard, Projects, Tasks, Recommendations, Analytics, Planning)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                             API LAYER                                  │
│                 FastAPI • Pydantic v2 • OAuth2 / JWT                   │
│   (Auth, Tasks, Teams, Recommendations, Workload, Analytics, AI Plan)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                          SERVICE & LOGIC LAYER                         │
│  • TaskWeightService (Deterministic 4-factor scoring)                  │
│  • RecommendationService (Baseline-v1 & Baseline-v2 engines)           │
│  • WorkloadService (40h capacity, availability & complexity weighting) │
│  • PerformanceService (Completion, on-time, streaks & incentives)      │
│  • RiskAssessmentService (Overload, deadline & skill gap detection)    │
│  • AIPlanningProvider (Heuristic / Ollama / OpenAI multi-provider)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                           DATABASE LAYER                               │
│                PostgreSQL (13 Core Relational Tables)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Research & ML Lab Track (Isolated Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESEARCH & ML BENCHMARKING                      │
│                                                                        │
│   Synthetic / Real-World Dataset (1,000 samples)                       │
│        ↓                                                               │
│   Feature Engineering (Skill Match, Workload, Experience, Task Weight) │
│        ↓                                                               │
│   Training Pipeline (Random Forest & XGBoost Classifiers)              │
│        ↓                                                               │
│   Evaluation Metrics (Accuracy: 98%, Precision, Recall, ROC-AUC)       │
│        ↓                                                               │
│   Explainability Engine (TreeSHAP Global Importances & Local Attribs)  │
│        ↓                                                               │
│   Governance Model Registry & Observational Feedback Logging           │
└────────────────────────────────────────────────────────────────────────┘
```

**Key Architectural Principle**: Research ML models remain in the `/research` directory and are exposed via read-only research endpoints (`/api/recommendations/research/*`). They **never** silently replace the deterministic production recommendation engine.

---

## 3. AI Project Planning Subsystem

```
                                Manager Input (Prompt / Spec)
                                              │
                                              ▼
                             AIPlanningProvider Abstraction
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            Heuristic Provider         Ollama Provider           OpenAI Provider
         (Local Rule-based, 0 API)    (Local Llama3, 0 API)     (GPT-4o, Cloud API)
                    └─────────────────────────┬─────────────────────────┘
                                              │
                                              ▼
                                 Draft Project Plan & WBS
                               (Milestones, Tasks, Estimates)
                                              │
                                              ▼
                                 Manager Review & Edit
                                              │
                                              ▼
                                 Approve & Materialize
                                              │
                                              ▼
                               Real Database Records Created:
                               Project → Tasks → TaskSkills
                                              │
                                              ▼
                             Ready for Baseline Recommendations
```

---

## 4. Database Schema Entities & Relationships

1. **User (`users`)**:
   - Stores authentication credentials, name, email, role (`ADMIN`, `MANAGER`, `DEVELOPER`).
2. **DeveloperProfile (`developer_profiles`)**:
   - Stores experience years, availability status (`AVAILABLE`, `PARTIAL`, `UNAVAILABLE`), performance score.
3. **Project (`projects`)**:
   - Stores project name, description, status (`ACTIVE`, `COMPLETED`, `ARCHIVED`), `created_by` (manager).
4. **Team (`teams`)**:
   - Belongs to a project (`project_id`).
5. **TeamMember (`team_members`)**:
   - Associative entity between `teams` and `developer_profiles`.
6. **Task (`tasks`)**:
   - Stores title, complexity, priority, estimated hours, deadline, status (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), task weight score, execution timer attributes (`total_actual_seconds`, `is_timer_running`, `timer_started_at`, `started_at`, `completed_at`, `completed_by`).
7. **TaskSkill (`task_skills`)**:
   - Stores required skills and proficiency levels (0-100%) for a task.
8. **Assignment (`assignments`)**:
   - Tracks developer assigned to a task, status (`ACTIVE`, `COMPLETED`, `REASSIGNED`), assigned timestamp.
9. **Recommendation (`recommendations`) & RecommendationExplanation (`recommendation_explanations`)**:
   - Persists ranked candidates, compatibility scores, and feature contribution attributions.
10. **Performance & Incentives (`developer_streaks`, `developer_achievements`, `developer_incentive_ledger`, `developer_performance_snapshots`)**:
    - Tracks points, streaks, badges, and periodic performance scores.
