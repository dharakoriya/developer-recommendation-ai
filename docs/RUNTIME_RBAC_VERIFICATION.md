# DevAlign AI — Runtime RBAC & Authentication Verification Guide

## 1. Overview
This document provides exact step-by-step procedures to perform runtime verification of Role-Based Access Control (RBAC), single source of truth user identity, role-isolated dashboards, and permission enforcement in DevAlign AI.

---

## 2. Account Identity & Credentials

| Role | Name | Email | Password | Allowed Workspace & Capabilities |
|---|---|---|---|---|
| **ADMIN** | System Admin | `admin@devalign.ai` | `admin123` | System Admin Dashboard, Full Projects, Teams, Developers, Tasks, Assignments, Recommendations, Workload, Research ML Lab & Audit Logs. |
| **MANAGER** | Project Manager | `manager@devalign.ai` | `manager123` | Manager Team Workspace (Managed Projects, Teams, Tasks, Assignments, Recommendations, Workload). Research pages restricted. |
| **DEVELOPER** | Alice Sharma | `alice@devalign.ai` | `dev123` | Dedicated Developer Workspace (My Assigned Tasks, My Capacity %, Availability, My Skills). Restricted from management & research pages. |

---

## 3. Account Switching & Runtime Diagnostic Verification

### Test 1 — ADMIN Account Verification
1. Navigate to `http://localhost:3000/login`.
2. Click **ADMIN** shortcut (`admin@devalign.ai` / `admin123`) and click **Sign In**.
3. Verify redirect to `/dashboard`.
4. Check bottom-right **Runtime Auth Debug** panel:
   - User Name: `System Admin`
   - AuthContext Role: `ADMIN`
   - JWT Role: `ADMIN`
   - Backend `/api/auth/me`: `ADMIN`
   - Status Badge: **`CONSISTENT AUTH STATE ✓`**
5. Verify Sidebar contains **Production Application** and **Research & ML Lab** links.

### Test 2 — MANAGER Account Verification
1. Click **Sign Out** in top bar.
2. Sign in as **MANAGER** (`manager@devalign.ai` / `manager123`).
3. Verify redirect to `/dashboard`.
4. Check **Runtime Auth Debug** panel:
   - Status Badge: **`CONSISTENT AUTH STATE ✓`** (Role: `MANAGER`).
5. Verify Sidebar contains Production links. Research Lab section is hidden.
6. Attempt direct URL access to `http://localhost:3000/research/ml`:
   - Result: Client-side **HTTP 403 Forbidden Access Denied** page renders.

### Test 3 — DEVELOPER Account Verification
1. Click **Sign Out**.
2. Sign in as **DEVELOPER** (`alice@devalign.ai` / `dev123`).
3. Verify redirect to `/dashboard`.
4. Check **Runtime Auth Debug** panel:
   - Status Badge: **`CONSISTENT AUTH STATE ✓`** (Role: `DEVELOPER`).
5. Verify Sidebar contains ONLY Developer Workspace items (`Dashboard`, `Tasks`, `Workload Engine`).
6. Verify Developer Dashboard renders personal workspace (My Assigned Tasks, My Workload Capacity, My Skills). No Create buttons or Admin stats.
7. Attempt direct URL access to `http://localhost:3000/projects`:
   - Result: Client-side & Backend **HTTP 403 Forbidden Access Denied** page renders.

---

## 4. Recommendation Engine Live Calculation Verification

1. Sign in as `manager@devalign.ai`.
2. Navigate to `/tasks` and click **+ Create Task**.
3. Create task `Implement Async Redis Caching`:
   - Project: `FinTech Payment Platform`
   - Required Skill: `Python` (Level: `85`)
   - Priority: `HIGH` | Complexity: `HIGH` | Hours: `16`
4. Navigate to `/recommendations`, select task `Implement Async Redis Caching`, and click **⚡ Find Best Developer**.
5. Observe candidate rankings and click **💡 Why this developer?** to inspect itemized score contributions:
   - Skill Match (35%)
   - Skill Coverage (15%)
   - Workload Capacity (20%)
   - Performance Rating (15%)
   - Experience (10%)
   - Availability (5%)
