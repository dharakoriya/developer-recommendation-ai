# DEVAlign AI — Authentication, Authorization & Security Hardening Matrix

## 1. Security Architecture Overview
DEVAlign AI enforces enterprise-grade Role-Based Access Control (RBAC) and security controls across its FastAPI backend, PostgreSQL relational store, and Next.js frontend client.

### Key Hardening Measures
1. **Public Self-Registration Elimination**:
   - The public registration endpoint (`POST /api/auth/register`) is permanently disabled and returns `HTTP 403 Forbidden`.
   - All user creation is routed through the administrator-exclusive endpoint (`POST /api/users`).
2. **First Admin Bootstrap Mechanism**:
   - Deterministic and idempotent CLI bootstrap script: `backend/scripts/create_admin.py`.
   - Allows safe provisioning of the root system administrator without requiring open registration endpoints or raw SQL manipulation.
3. **Admin User Lifecycle & Status Governance**:
   - Administrators can provision new users, update user roles, toggle account active status, and reset credentials.
   - Deactivated users (`is_active == False`) are immediately blocked from logging in with `HTTP 401 Unauthorized`.
4. **Developer Profile Synchronization**:
   - Creating a user with `DEVELOPER` role automatically provisions an associated `DeveloperProfile` record in the same atomic database transaction.
5. **Strict Cryptographic Standards**:
   - Passwords are salted and hashed using `bcrypt`.
   - RFC 5322 email syntax validation enforced via Pydantic `EmailStr`.

---

## 2. RBAC Endpoint & Route Security Matrix

| Area / Endpoint / Route | Method | Allowed Roles | Unauthenticated | Non-Admin / Unauthorized | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth: Register** (`/api/auth/register`) | `POST` | *Disabled* | `403 Forbidden` | `403 Forbidden` | ✅ PASS |
| **Auth: Login** (`/api/auth/login`) | `POST` | Public / Active Users | `401` (if bad creds/inactive) | N/A | ✅ PASS |
| **Auth: Current User** (`/api/auth/me`) | `GET` | All Active Roles | `401 Unauthorized` | N/A | ✅ PASS |
| **Users: List System Users** (`/api/users`) | `GET` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Users: Provision User** (`/api/users`) | `POST` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Users: Get User Detail** (`/api/users/{id}`) | `GET` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Users: Update User** (`/api/users/{id}`) | `PUT` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Users: Toggle Status** (`/api/users/{id}/status`) | `PATCH` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Users: Reset Password** (`/api/users/{id}/reset-password`) | `POST` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` | ✅ PASS |
| **Projects: Create / Edit** (`/api/projects`) | `POST/PUT` | `ADMIN`, `MANAGER` | `401 Unauthorized` | `403 Forbidden` (Developer) | ✅ PASS |
| **Teams: Manage** (`/api/teams`) | `POST/PUT` | `ADMIN`, `MANAGER` | `401 Unauthorized` | `403 Forbidden` (Developer) | ✅ PASS |
| **Tasks: Create / Assign** (`/api/tasks`) | `POST` | `ADMIN`, `MANAGER` | `401 Unauthorized` | `403 Forbidden` (Developer) | ✅ PASS |
| **Tasks: Timer Start / Stop** (`/api/tasks/{id}/timer/start`) | `POST` | Assignee / `ADMIN` | `401 Unauthorized` | `403 Forbidden` (Unassigned dev) | ✅ PASS |
| **Research: ML Evaluation** (`/api/research/*`) | `ALL` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` (Manager/Dev) | ✅ PASS |
| **Audit: Governance Log** (`/api/recommendations/audit`) | `GET` | `ADMIN` | `401 Unauthorized` | `403 Forbidden` (Manager/Dev) | ✅ PASS |
| **Frontend UI: `/admin/users`** | `GET` | `ADMIN` | Redirect to Login | Redirect to Dashboard | ✅ PASS |

---

## 3. Automated Security Hardening Test Cases

The test suite in [`backend/tests/test_auth_rbac_hardening.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/tests/test_auth_rbac_hardening.py) and [`backend/tests/test_auth.py`](file:///d:/Custom%20Project/dhara/devalign-ai/backend/tests/test_auth.py) covers the following explicit security assertions:

1. `test_public_signup_endpoint_is_blocked`: Asserts `POST /api/auth/register` returns `HTTP 403 Forbidden`.
2. `test_unauthenticated_user_endpoints_rejected`: Asserts unauthenticated requests to `/api/users` return `HTTP 401 Unauthorized`.
3. `test_non_admin_cannot_access_user_management`: Asserts `MANAGER` and `DEVELOPER` requests to `/api/users` return `HTTP 403 Forbidden`.
4. `test_admin_can_provision_developer_with_profile`: Asserts `ADMIN` can provision developers and auto-generates linked `DeveloperProfile`.
5. `test_admin_duplicate_email_rejected`: Asserts duplicate email registration returns `HTTP 400/409 Conflict`.
6. `test_admin_user_status_deactivation_and_login_blocking`: Asserts deactivating a user immediately prevents authentication with `HTTP 401`.
7. `test_admin_reset_user_password`: Asserts administrator password reset invalidates old credentials and enables new login.
8. `test_role_authorization_permissions`: Asserts hierarchical RBAC permissions across all standard application endpoints.
