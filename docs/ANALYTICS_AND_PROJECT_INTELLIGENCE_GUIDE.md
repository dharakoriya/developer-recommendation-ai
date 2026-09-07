# Project Intelligence & Analytics Guide — DevAlign AI

DevAlign AI introduces a complete **Project Intelligence and Performance Analytics Engine**, unifying data across projects, teams, developers, tasks, workload, and recommendation conversion lifecycles.

---

## 1. Project Health Overview (`/analytics`)

The **Project Health Score (0 – 100)** provides real-time visibility into project risk levels without relying on mock data.

### Health Score Formula
$$\text{Project Health Score} = (0.30 \times \text{Completion Pct}) + (0.25 \times \text{Overdue Factor}) + (0.20 \times \text{Unassigned Factor}) + (0.25 \times \text{Workload Risk Factor})$$

- **Completion Pct (30%)**: Percentage of project tasks marked `COMPLETED`.
- **Overdue Factor (25%)**: Penalty for active tasks exceeding their target deadline ($100 - \text{Overdue Pct} \times 2$).
- **Unassigned Factor (20%)**: Penalty for tasks sitting unassigned in the backlog ($100 - \text{Unassigned Pct} \times 1.5$).
- **Workload Risk Factor (25%)**: Penalty for assigned team developers experiencing high workload or overload risk.

### Health Status Categories
- 🟢 **HEALTHY (85 – 100)**: Project progress is on track with balanced developer workload.
- 🟡 **AT RISK (60 – 84)**: Minor backlog or overdue tasks identified.
- 🔴 **CRITICAL (0 – 59)**: High proportion of overdue/unassigned tasks or overloaded developers requiring immediate intervention.

---

## 2. Team Capacity Analytics (`/analytics/teams`)

Measures capacity utilization across active development teams.

- **Total Capacity Hours**: Calculated as $\text{Total Active Developers} \times 40 \text{ hrs/week}$.
- **Used Capacity Hours**: Total assigned workload hours across active developer tasks.
- **Available Capacity Hours**: Net unallocated engineering capacity.
- **Workload Distribution**:
  - **Underutilized**: $< 15 \text{ hrs/week}$ assigned.
  - **Balanced**: $15 \text{ – } 35 \text{ hrs/week}$ assigned.
  - **High Workload**: $36 \text{ – } 45 \text{ hrs/week}$ assigned.
  - **Overloaded**: $> 45 \text{ hrs/week}$ assigned.

---

## 3. Developer Intelligence & Comparison Matrix (`/analytics/developers`)

Side-by-side performance matrix for project managers and admins.

### Tracked Metrics
- **Composite Performance Score (0 – 100)**
- **Completion Rate (%)**
- **Weighted Productivity Score**
- **Active Workload Hours & Score (%)**
- **Current Completion Streak (Days 🔥)**
- **Total Incentive Points (pts)**
- **Primary Technical Skills**
- **Availability Status**

### Role-Based Security (RBAC)
- **ADMIN / MANAGER**: Full access to multi-developer matrix.
- **DEVELOPER**: Access restricted (403 Forbidden); developers can only view their own personal performance metrics.

---

## 4. Task Intelligence & Weighting (`/analytics/tasks`)

Task difficulty and distribution analytics:
- **Priority & Complexity Breakdown**: Low, Medium, High, Critical distribution.
- **Task Weight Score Distribution**:
  - Low Weight ($< 20$)
  - Medium Weight ($20 \text{ – } 49$)
  - High Weight ($50 \text{ – } 74$)
  - Critical Weight ($75+$)
- **On-Time Completion Rate**: Percentage of completed tasks delivered within estimated timeframe buffers.

---

## 5. Recommendation Effectiveness & Conversion Funnel (`/analytics/recommendations`)

Tracks the end-to-end lifecycle conversion of AI recommendations:

$$\text{RECOMMENDED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{ASSIGNED} \longrightarrow \text{COMPLETED}$$

- **Acceptance Rate**: $\frac{\text{Accepted Recommendations}}{\text{Total Recommendations Generated}}$
- **Assignment Conversion Rate**: $\frac{\text{Assignments Created}}{\text{Total Recommendations Generated}}$
- **Completion Conversion Rate**: $\frac{\text{Completed Tasks}}{\text{Assignments Created}}$

---

## 6. Centralized API Client (`frontend/lib/api.ts`)

All frontend API calls are routed through a standardized fetch client:
- Automatic token header injection (`Authorization: Bearer <devalign_token>`).
- Centralized base URL configuration (`/api`).
- Uniform HTTP status error extraction (401, 403, 404, 422, 500, Network Failure).
