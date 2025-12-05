# 🔐 Permissions Guide - Abrazar API

## Overview

The Abrazar API uses a hybrid permission system combining:

- **RBAC** (Role-Based Access Control): Coarse-grained access by role
- **PBAC** (Permission-Based Access Control): Fine-grained permissions
- **Multi-Tenancy**: Organization-level data isolation
- **SuperAdmin**: Global bypass for administrators

---

## Roles

### Hierarchy

```
ADMIN (System Administrator)
  └── ORGANIZATION_ADMIN (Organization Manager)
        └── COORDINATOR (Team Lead)
              └── SOCIAL_WORKER (Field Worker)
                    └── VOLUNTEER (Basic Access)
```

### Role Capabilities

#### 🔴 ADMIN

**Full system access with SuperAdmin capability**

| Resource       | Create | Read | Update | Delete | Special  |
| -------------- | ------ | ---- | ------ | ------ | -------- |
| Users          | ✅     | ✅   | ✅     | ✅     | All orgs |
| Organizations  | ✅     | ✅   | ✅     | ✅     | -        |
| Cases          | ✅     | ✅   | ✅     | ✅     | All orgs |
| Homeless       | ✅     | ✅   | ✅     | ✅     | All orgs |
| Teams          | ✅     | ✅   | ✅     | ✅     | -        |
| Zones          | ✅     | ✅   | ✅     | ✅     | -        |
| Statistics     | -      | ✅   | -      | -      | All orgs |
| Audit Logs     | -      | ✅   | -      | -      | All orgs |
| Service Points | ✅     | ✅   | ✅     | ✅     | -        |

**SuperAdmin Bypass**: With `x-superadmin-secret` header, bypasses ALL permission checks.

---

#### 🟠 ORGANIZATION_ADMIN

**Full access within their organization**

| Resource       | Create | Read | Update | Delete | Scope   |
| -------------- | ------ | ---- | ------ | ------ | ------- |
| Users          | ✅     | ✅   | ✅     | ✅     | Own org |
| Cases          | ✅     | ✅   | ✅     | ✅     | Own org |
| Homeless       | ✅     | ✅   | ✅     | ✅     | Own org |
| Teams          | ✅     | ✅   | ✅     | ✅     | Own org |
| Zones          | ✅     | ✅   | ✅     | ✅     | Own org |
| Statistics     | -      | ✅   | -      | -      | Own org |
| Service Points | ✅     | ✅   | ✅     | ✅     | Own org |

---

#### 🟡 COORDINATOR

**Team management and case assignment**

| Resource   | Create | Read | Update | Delete | Scope          |
| ---------- | ------ | ---- | ------ | ------ | -------------- |
| Cases      | ✅     | ✅   | ✅     | ❌     | Assigned zones |
| Homeless   | ✅     | ✅   | ✅     | ❌     | Own org        |
| Teams      | ✅     | ✅   | ✅     | ❌     | Own teams      |
| Zones      | ❌     | ✅   | ❌     | ❌     | Own org        |
| Statistics | -      | ✅   | -      | -      | Own zones      |

---

#### 🟢 SOCIAL_WORKER

**Case management and field work**

| Resource       | Create | Read | Update | Delete | Scope    |
| -------------- | ------ | ---- | ------ | ------ | -------- |
| Cases          | ✅     | ✅   | ✅     | ❌     | Assigned |
| Homeless       | ✅     | ✅   | ✅     | ❌     | Own org  |
| Comments       | ✅     | ✅   | ✅     | ❌     | Own      |
| Service Points | ❌     | ✅   | ❌     | ❌     | Public   |

---

#### 🔵 VOLUNTEER

**Basic case creation and reporting**

| Resource       | Create | Read     | Update | Delete | Scope              |
| -------------- | ------ | -------- | ------ | ------ | ------------------ |
| Cases          | ✅     | ⚠️ Own   | ❌     | ❌     | Own created        |
| Homeless       | ✅     | ⚠️ Basic | ❌     | ❌     | Registered by self |
| Service Points | ❌     | ✅       | ❌     | ❌     | Public             |

---

## Granular Permissions (PBAC)

### Permission Format

Permissions follow the pattern: `resource:action`

### Available Permissions

```javascript
// Cases
cases:create     // Create new cases
cases:read       // View cases
cases:update     // Update case details
cases:delete     // Delete cases (soft delete)
cases:assign     // Assign cases to users/teams
cases:close      // Mark cases as resolved/closed

// Homeless / Persons
persons:create   // Register new homeless persons
persons:read     // View person profiles
persons:update   // Update person information
persons:delete   // Remove person records

// Teams
teams:create     // Create new teams
teams:read       // View team information
teams:update     // Update team details
teams:delete     // Remove teams
teams:manage     // Manage team members

// Zones
zones:create     // Create geographic zones
zones:read       // View zones
zones:update     // Modify zone boundaries
zones:delete     // Remove zones
zones:manage     // Assign teams to zones

// Statistics
statistics:view  // Access dashboard & analytics

// Audit
audit:view       // View system audit logs

// Service Points
servicepoints:create  // Create service points
servicepoints:read    // View service points
servicepoints:update  // Update service point info
servicepoints:delete  // Remove service points
```

### Checking Permissions in Code

```javascript
// Middleware usage
const {
  requirePermission,
  requireAnyPermission,
} = require("./middlewares/permission.middleware");

// Single permission
router.post("/cases", requirePermission("cases:create"), createCase);

// Any of multiple permissions
router.get(
  "/statistics",
  requireAnyPermission("statistics:view", "audit:view"),
  getStats
);
```

---

## SuperAdmin Bypass

### How It Works

When a request includes valid SuperAdmin headers, the `logAdminBypass` function:

1. Checks if user has `ADMIN` role
2. Validates `x-superadmin-secret` against primary OR backup secret
3. Checks rate limit (3 req/min per IP)
4. Validates JTI (if enabled) for anti-replay
5. Logs the action to console, file, and database
6. Marks `req.user.isSuperAdmin = true`
7. All subsequent permission checks are bypassed

### Required Headers

```http
x-superadmin-secret: <your-secret>
x-superadmin-jti: <unique-uuid>
```

### What SuperAdmin CAN Do

- ✅ Access data from ALL organizations
- ✅ Bypass role checks
- ✅ Bypass permission checks
- ✅ Delete protected resources
- ✅ View all audit logs

### What SuperAdmin CANNOT Do

- ❌ Bypass rate limits (intentional)
- ❌ Bypass authentication (JWT still required)
- ❌ Avoid audit logging (forced)
- ❌ Use without ADMIN role

---

## Endpoints by Permission Required

### Public (No Auth)

```
GET  /api/health
GET  /api/service-points/public
POST /api/auth/login
POST /api/auth/register
POST /api/auth/firebase-login
```

### Authenticated (Any Role)

```
GET    /api/auth/me
PATCH  /api/auth/me
POST   /api/auth/logout
GET    /api/sessions/my
DELETE /api/sessions/:id
```

### role: VOLUNTEER+

```
POST   /api/homeless          (create)
GET    /api/homeless          (list)
GET    /api/homeless/:id      (read)
POST   /api/cases             (create)
GET    /api/cases             (list own)
```

### Role: SOCIAL_WORKER+

```
PATCH  /api/homeless/:id      (update)
PATCH  /api/cases/:id         (update)
POST   /api/cases/:id/comments
GET    /api/cases/:id/history
```

### Role: COORDINATOR+

```
POST   /api/cases/:id/assign
GET    /api/statistics/zones
POST   /api/teams
PATCH  /api/teams/:id
```

### Role: ORGANIZATION_ADMIN+

```
DELETE /api/homeless/:id
DELETE /api/cases/:id
DELETE /api/teams/:id
POST   /api/zones
DELETE /api/zones/:id
GET    /api/statistics/*
POST   /api/service-points
```

### Role: ADMIN Only

```
GET    /api/audit
GET    /api/organizations
POST   /api/organizations
DELETE /api/organizations/:id
```

### Role: ADMIN + SuperAdmin Header

```
DELETE /api/homeless/:id      (cross-org)
GET    /api/statistics/*      (cross-org)
*      Any endpoint           (bypass all)
```

---

## Extending Permissions

### Adding a New Permission

1. **Define the permission** in your module:

```javascript
// modules/my-module/my-module.routes.js
router.post(
  "/",
  authenticate,
  requirePermission("myresource:create"),
  controller.create
);
```

2. **Document the permission** in this file.

3. **Update role definitions** if needed.

### Creating Custom Middleware

```javascript
const canAccessResource = async (req, res, next) => {
  // Check SuperAdmin bypass first
  if (await logAdminBypass(req, "canAccessResource")) {
    return next();
  }

  // Your custom logic
  const hasAccess = await checkCustomAccess(req.user.id, req.params.id);

  if (!hasAccess) {
    return res.status(403).json({
      status: "fail",
      message: "Access denied",
    });
  }

  next();
};
```

---

## Multi-Tenancy

### Automatic Filtering

The `multi-tenant.middleware.js` automatically adds `organizationId` to all queries:

```javascript
// Before middleware
prisma.case.findMany();

// After middleware (automatically)
prisma.case.findMany({ where: { organizationId: req.user.organizationId } });
```

### Bypassing Multi-Tenancy

Only SuperAdmin can bypass organization filtering:

```javascript
if (req.user.isSuperAdmin) {
  // Query without organizationId filter
}
```

---

**Last Updated**: December 2025
**Version**: 1.0.0
