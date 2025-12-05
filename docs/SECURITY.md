# 🔒 Security Documentation - Abrazar API

## Overview

This document covers all security aspects of the Abrazar API, including authentication, authorization, rate limiting, and SuperAdmin secure mode.

---

## Authentication

### JWT Token System

The API uses a dual-token authentication system:

| Token Type    | Expiration                                         | Purpose       |
| ------------- | -------------------------------------------------- | ------------- |
| Access Token  | 15 minutes (configurable via `JWT_EXPIRES_IN`)     | API requests  |
| Refresh Token | 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`) | Token renewal |

### Login Flow

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "ADMIN",
      "organizationId": "uuid"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Token Revocation

Tokens are revoked by storing them in a Redis blacklist:

- On logout: Current token is blacklisted
- On password change: All tokens are revoked
- Manual revocation via sessions management

---

## Authorization

### Role-Based Access Control (RBAC)

| Role                 | Description          | Access Level                               |
| -------------------- | -------------------- | ------------------------------------------ |
| `ADMIN`              | System administrator | Full access + SuperAdmin capability        |
| `ORGANIZATION_ADMIN` | Organization manager | Full access within their organization      |
| `COORDINATOR`        | Team coordinator     | Manage teams, assign cases                 |
| `SOCIAL_WORKER`      | Field worker         | Create/update cases, interact with persons |
| `VOLUNTEER`          | Basic volunteer      | Create cases, limited permissions          |

### Permission-Based Access Control (PBAC)

Granular permissions for fine-grained control:

```
cases:create      - Create new cases
cases:read        - View cases
cases:update      - Update cases
cases:delete      - Delete cases
teams:manage      - Manage team assignments
zones:manage      - Manage geographic zones
statistics:view   - Access dashboard statistics
audit:view        - View audit logs
```

### Multi-Tenancy

All data is isolated by organization:

- Each user belongs to one organization
- Queries are automatically filtered by `organizationId`
- Cross-organization data access is prevented at the middleware level

---

## SuperAdmin Secure Mode

> ⚠️ **CRITICAL**: SuperAdmin mode bypasses ALL permission checks. Use with extreme caution.

### Overview

The `ADMIN` role can activate SuperAdmin mode by providing a secret header. This grants:

- Access to ALL organizations' data
- Bypass of all permission checks
- Full CRUD on any resource

### Required Headers

```http
x-superadmin-secret: <PRIMARY_OR_BACKUP_SECRET>
x-superadmin-jti: <UNIQUE_UUID>
```

### Double Secret System

Two secrets are supported for rotation without downtime:

| Environment Variable       | Required    | Purpose                    |
| -------------------------- | ----------- | -------------------------- |
| `SUPERADMIN_SECRET`        | ✅ Yes      | Primary secret             |
| `SUPERADMIN_SECRET_BACKUP` | ⬜ Optional | Backup secret for rotation |

**Rotation Process:**

1. Set the new secret as `SUPERADMIN_SECRET_BACKUP`
2. Update all clients to use the new secret
3. Move the new secret to `SUPERADMIN_SECRET`
4. Remove or update `SUPERADMIN_SECRET_BACKUP`

### Rate Limiting

SuperAdmin requests are rate-limited per IP:

| Setting      | Default  | Environment Variable    |
| ------------ | -------- | ----------------------- |
| Max Requests | 3        | `SUPERADMIN_RATE_LIMIT` |
| Window       | 1 minute | Fixed                   |

When exceeded, the API returns `403 Forbidden` (not 429) to avoid leaking information.

### JTI Anti-Replay Protection

To prevent replay attacks, each SuperAdmin request must include a unique JTI (JWT ID):

- JTIs are stored in Redis with a 5-minute TTL
- Reusing a JTI results in `403 Forbidden`
- Toggle with `SUPERADMIN_JTI_ENABLED` (default: `true`)

### Audit Logging

Every SuperAdmin action is logged:

1. **Console Log**: Real-time output
2. **File Log**: `logs/superadmin.log`
3. **Database**: `AuditLog` table with full metadata

**Log Format:**

```
[SUPERADMIN] user=<userId> org=<orgId> action=<method> path=<url> timestamp=<ISO>
```

### Example Usage

```bash
curl -X DELETE "https://api.abrazar.org/api/homeless/123" \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "x-superadmin-secret: your-secret-here" \
  -H "x-superadmin-jti: $(uuidgen)"
```

---

## Rate Limiting

### Global Rate Limits

| Endpoint Category                  | Limit        | Window     | Error Code |
| ---------------------------------- | ------------ | ---------- | ---------- |
| General API                        | 100 requests | 15 minutes | 429        |
| Authentication (`/api/auth/login`) | 5 requests   | 1 hour     | 429        |
| Emergency creation                 | 5 requests   | 1 minute   | 429        |
| SuperAdmin                         | 3 requests   | 1 minute   | 403        |

### Bypass

Requests with valid SuperAdmin headers do NOT bypass global rate limits (only permission checks).

---

## Security Headers

The API uses Helmet.js with the following headers:

| Header                      | Value                               | Purpose               |
| --------------------------- | ----------------------------------- | --------------------- |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains | Force HTTPS           |
| `X-Content-Type-Options`    | nosniff                             | Prevent MIME sniffing |
| `X-Frame-Options`           | DENY                                | Prevent clickjacking  |
| `X-XSS-Protection`          | 1; mode=block                       | XSS filter            |
| `Content-Security-Policy`   | default-src 'self'                  | CSP                   |

---

## Input Validation

All inputs are validated using Zod schemas:

- Request body validation
- Query parameters validation
- Path parameters validation

### Sanitization

- **XSS**: `xss-clean` middleware strips HTML tags
- **HPP**: Prevents HTTP Parameter Pollution

---

## Password Security

- Hash algorithm: bcrypt
- Salt rounds: 10
- Minimum length: 8 characters (validated on registration)

---

## Best Practices

### For Developers

1. **Never log secrets** - Check logs for accidental secret exposure
2. **Rotate secrets regularly** - Use the backup secret feature
3. **Monitor audit logs** - Review SuperAdmin usage
4. **Use strong secrets** - Min 32 characters, random

### For Production

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (64+ bytes)
3. Enable `SUPERADMIN_JTI_ENABLED=true`
4. Set appropriate `SUPERADMIN_RATE_LIMIT`
5. Configure CORS for specific origins only

---

## Environment Variables

```env
# Authentication
JWT_SECRET=your-64-byte-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-64-byte-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# SuperAdmin
SUPERADMIN_SECRET=your-primary-secret
SUPERADMIN_SECRET_BACKUP=your-backup-secret
SUPERADMIN_RATE_LIMIT=3
SUPERADMIN_JTI_ENABLED=true

# Security
NODE_ENV=production
```

---

## Risks and Mitigations

| Risk                    | Mitigation                            |
| ----------------------- | ------------------------------------- |
| Secret exposure in logs | Strip secrets from request logging    |
| Token theft             | Short expiration + Redis blacklist    |
| Brute force             | Rate limiting + account lockout       |
| XSS attacks             | Input sanitization + CSP headers      |
| SQL injection           | Prisma ORM with parameterized queries |
| CSRF                    | JWT auth (no cookies) + SameSite      |
| Replay attacks          | JTI anti-replay for SuperAdmin        |

---

**Last Updated**: December 2025
**Version**: 1.0.0
