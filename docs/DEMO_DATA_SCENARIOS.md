# DEVAlign AI — Demonstration Data & Scenario Matrix

This document defines the complete matrix of 10 demonstration tasks and 12 core scenarios in the official DevAlign AI demonstration dataset (populated via `python backend/scripts/seed_demo_data.py`).

---

## 1. Demonstration Users & Profiles

| Name | Role | Email | Password | Experience | Performance | Availability | Streaks & Points | Specialization |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `ADMIN` | `admin@devalign.ai` | `admin123` | N/A | N/A | Available | Full Platform Access | System Administration & Config |
| **Project Manager** | `MANAGER` | `manager@devalign.ai` | `manager123` | N/A | N/A | Available | Project Management | Project, Team, Task & Planning |
| **Alice Sharma** | `DEVELOPER` | `alice@devalign.ai` | `dev123` | 6.0 yrs | 94.0 / 100 | AVAILABLE | 5 Days (850 pts) | Python (90%), FastAPI (88%), PostgreSQL (85%), Docker (65%) |
| **Rahul Patel** | `DEVELOPER` | `rahul@devalign.ai` | `dev123` | 4.5 yrs | 88.0 / 100 | AVAILABLE | 3 Days (480 pts) | React (95%), TypeScript (92%), UI/UX (85%), Python (40%) |
| **Priya Mehta** | `DEVELOPER` | `priya@devalign.ai` | `dev123` | 5.5 yrs | 92.0 / 100 | AVAILABLE (Heavy) | 4 Days (620 pts) | Fullstack (Python, FastAPI, React, TS, PG ~80%) |
| **David Wilson** | `DEVELOPER` | `david@devalign.ai` | `dev123` | 7.0 yrs | 86.0 / 100 | **UNAVAILABLE** | 1 Day (0 pts) | Docker (95%), PostgreSQL (85%), Python (60%) |

---

## 2. Demonstration Projects & Teams

| Project Name | Status | Lead/Creator | Description | Teams |
| :--- | :--- | :--- | :--- | :--- |
| **FinTech Payment Platform** | `ACTIVE` | Project Manager | High-throughput payment gateway & real-time transaction engine | `Core Payments Backend Team` (Alice, Priya) |
| **University Learning Portal** | `ACTIVE` | Project Manager | Online student course registration and grading management portal | `Portal UI/UX Team` (Rahul) |
| **Internal Analytics Dashboard** | `ACTIVE` | Project Manager | Enterprise telemetry, executive metrics & ML observability | `Platform & DevOps Team` (David, Alice) |

---

## 3. Comprehensive Task & Scenario Matrix

| Case ID | Scenario Name | Task Title | Project | Team | Status | Assigned Dev | Weight Score (Category) | Timer State | Risk Level | Expected UI Behavior / Viva Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CASE 1** | **Unassigned TODO (Recommendation Demo)** | *Build Payment Webhook Ingestion API* | FinTech Payment Platform | Core Payments Backend | `TODO` | None | **70.20** (HEAVY) | Not Started (0s) | MEDIUM | Demonstrates **"Find Best Developer"**. Manager clicks recommendations: **Alice** ranks #1 (100% skill match, low workload), **Priya** ranks lower due to workload pressure, **David** is excluded (Unavailable), **Rahul** is penalized (missing skills). |
| **CASE 2** | **Recommended But Not Yet Assigned** | *Design Student Course Recommendation Schema* | University Learning Portal | None | `TODO` | None | **52.30** (HEAVY) | Not Started (0s) | LOW | Pre-generated baseline recommendation stored in PostgreSQL. Manager opens recommendations, reviews contribution breakdown, and can 1-click assign. |
| **CASE 3** | **Active In-Progress with Running Timer** | *Build Authentication & RBAC Engine* | FinTech Payment Platform | Core Payments Backend | `IN_PROGRESS` | Alice Sharma | **73.86** (HEAVY) | **Running** (Timer active, 30m logged) | MEDIUM | Login as **Alice**. Open "My Tasks" -> Task Detail. Timer is actively ticking live with minutes and seconds. Alice can pause or record work. |
| **CASE 4** | **In-Progress Paused Task** | *Implement Realtime Payment Dashboard* | FinTech Payment Platform | Portal UI/UX | `IN_PROGRESS` | Rahul Patel | **53.95** (HEAVY) | **Paused** (90m [5400s] accumulated) | LOW | Login as **Rahul**. Timer is paused displaying `01:30:00` accumulated actual time. Rahul can click "Resume Timer" to restart execution. |
| **CASE 5** | **Completed Task Lifecycle** | *Containerize Microservices with Docker* | FinTech Payment Platform | Core Payments Backend | `COMPLETED` | Alice Sharma | **67.99** (HEAVY) | Completed (14h [50400s]) | LOW (0.0) | Displays complete lifecycle: `completed_by` = Alice, `completed_at` timestamp recorded, assignment marked `COMPLETED`. |
| **CASE 6** | **High Weight / CRITICAL Task** | *Core Transaction Idempotency & Settlement Engine* | FinTech Payment Platform | Core Payments Backend | `TODO` | None | **81.08** (CRITICAL) | Not Started (0s) | HIGH | Demonstrates Task Weight Formula with Critical Priority (100), High Complexity (75), 32h Effort (80), and Expert Skills (90%). Categorized as **CRITICAL**. |
| **CASE 7** | **Low Weight / LIGHT Task** | *Update Portal Privacy Policy & FAQ Copy* | University Learning Portal | Portal UI/UX | `TODO` | None | **24.90** (LIGHT) | Not Started (0s) | LOW | Demonstrates contrasting light weight: Low Priority (25), Low Complexity (25), 4h Effort (20), Light Skills (25). Categorized as **LIGHT**. |
| **CASE 8** | **Overloaded Developer Workload Pressure** | *Refactor Database Connection Pool & Caching* | Internal Analytics Dashboard | Platform & DevOps | `IN_PROGRESS` | Priya Mehta | **73.49** (HEAVY) | Paused (60m) | HIGH | Priya is assigned T8 (24h) + T10 (18h) = 42h active effort (105% workload). Demonstrates Workload Anti-Monopoly penalty and workload warning badge. |
| **CASE 9** | **Skill Gap & 3-Tier Categorization** | *Multi-Cluster Docker Ingress Controller* | Internal Analytics Dashboard | Platform & DevOps | `TODO` | None | **73.11** (HEAVY) | Not Started (0s) | MEDIUM | Demonstrates Recommendation Categorization: **David** is *INELIGIBLE* ("❌ Developer Currently Unavailable"), **Alice** is *CONDITIONALLY_ELIGIBLE* ("⚠ Partial Skill Coverage"), **Rahul** is *INELIGIBLE* ("❌ Missing Required Skills"). |
| **CASE 10** | **High Priority Deadline Risk** | *Emergency Security Patch for JWT Signatures* | FinTech Payment Platform | Core Payments Backend | `IN_PROGRESS` | Priya Mehta | **79.92** (CRITICAL) | Paused (30m) | **CRITICAL** | Deadline is within 12 hours + developer is overloaded. Triggers CRITICAL Schedule Risk + High Workload Risk in the Risk Assessment Engine. |
| **CASE 11** | **Multi-Factor Incentive Ledger** | *Containerize Microservices with Docker* | FinTech Payment Platform | Core Payments Backend | `COMPLETED` | Alice Sharma | **67.99** (HEAVY) | Completed | LOW | Demonstrates incentive breakdown: Base (600 pts) + Difficulty Bonus (120 pts) + On-Time Bonus (90 pts) + Streak Bonus (40 pts) = **850 Total Points**. |
| **CASE 12** | **Project -> Team -> Task -> Dev Member Flow** | *Build Payment Webhook Ingestion API* | FinTech Payment Platform | Core Payments Backend | `TODO` | None | **70.20** (HEAVY) | Not Started (0s) | MEDIUM | Demonstrates hierarchical structure: Project (`FinTech Platform`) -> Team (`Core Payments`) -> Task (`Webhook Ingestion`) -> Team Members (`Alice`, `Priya`). |

---

## 4. Verification & Validation Summary

Running `python backend/scripts/seed_demo_data.py` consistently yields:
- **Total Users**: 6
- **Total Projects**: 3
- **Total Teams**: 3
- **Total Developers**: 4
- **Total Skills**: 7
- **Total Tasks**: 10
- **Total Assignments**: 5
- **Pre-generated Recommendations**: 20 (across 5 unassigned tasks)
- **Incentive Ledgers**: 3
- **Developer Streaks**: 4
