# 📡 API Reference - Abrazar API

## Base URL

```
Production: https://abrazar-backend.up.railway.app/api
Development: http://localhost:3001/api
```

## Authentication

All authenticated endpoints require:

```http
Authorization: Bearer <access_token>
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": { ... }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

### HTTP Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 429  | Too Many Requests (rate limited)     |
| 500  | Internal Server Error                |

---

## Authentication (`/api/auth`)

### POST /api/auth/register

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "organizationId": "uuid",
  "termsAccepted": true,
  "privacyAccepted": true
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VOLUNTEER"
    },
    "token": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST /api/auth/login

Authenticate user with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "ADMIN",
      "organizationId": "uuid",
      "organization": {
        "id": "uuid",
        "name": "Sample Org",
        "type": "NGO"
      }
    },
    "token": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**

- 400: Invalid credentials
- 429: Rate limit exceeded (5/hour)

---

### POST /api/auth/firebase-login

Authenticate with Firebase token (Google, Facebook).

**Request:**

```json
{
  "idToken": "firebase-id-token"
}
```

**Response:** Same as `/login`

---

### PATCH /api/auth/me

Update current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "name": "New Name",
  "phone": "+5493512345678"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

### POST /api/auth/logout

Revoke current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## Homeless / Persons (`/api/homeless`)

### GET /api/homeless

List all homeless persons (filtered by organization).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| apodo | string | Search by nickname |
| lat | number | Filter by latitude |
| lng | number | Filter by longitude |
| radius | number | Radius in km (requires lat/lng) |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "homeless": [
      {
        "id": "uuid",
        "apodo": "Juan",
        "lat": -31.4201,
        "lng": -64.1888,
        "dateOfBirth": "1980-01-15",
        "gender": "MALE",
        "createdAt": "2025-01-01T00:00:00Z",
        "registeredBy": {
          "id": "uuid",
          "name": "Worker Name"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### POST /api/homeless

Register a new homeless person.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "apodo": "Juan",
  "lat": -31.4201,
  "lng": -64.1888,
  "dateOfBirth": "1980-01-15",
  "gender": "MALE",
  "healthNotes": "Diabetes",
  "photo": "(base64 or multipart)"
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "homeless": { ... }
  }
}
```

---

### GET /api/homeless/:id

Get a specific homeless person.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "homeless": {
      "id": "uuid",
      "apodo": "Juan",
      "cases": [ ... ],
      "comments": [ ... ]
    }
  }
}
```

---

### PATCH /api/homeless/:id

Update homeless person details.

**Headers:** `Authorization: Bearer <token>`
**Permissions:** `SOCIAL_WORKER+`

**Request:**

```json
{
  "healthNotes": "Updated notes"
}
```

---

### DELETE /api/homeless/:id

Delete a homeless person record.

**Headers:**

- `Authorization: Bearer <token>`
- `x-superadmin-secret: <secret>` (for SuperAdmin)
- `x-superadmin-jti: <uuid>` (for SuperAdmin)

**Permissions:** `ORGANIZATION_ADMIN+` or SuperAdmin

**Response (200):**

```json
{
  "status": "success",
  "message": "Homeless record deleted"
}
```

---

## Cases (`/api/cases`)

### GET /api/cases

List cases.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | REPORTED, VERIFIED, IN_PROGRESS, RESOLVED, CLOSED |
| zoneId | uuid | Filter by zone |
| teamId | uuid | Filter by team |
| assignedTo | uuid | Filter by assigned user |
| priority | string | LOW, MEDIUM, HIGH, URGENT |

---

### POST /api/cases

Create a new case.

**Request:**

```json
{
  "homelessId": "uuid",
  "description": "Case description",
  "priority": "HIGH",
  "zoneId": "uuid"
}
```

---

### PATCH /api/cases/:id

Update case details.

**Request:**

```json
{
  "status": "IN_PROGRESS",
  "notes": "Following up"
}
```

---

### POST /api/cases/:id/assign

Assign case to user or team.

**Permissions:** `COORDINATOR+`

**Request:**

```json
{
  "userId": "uuid",
  "teamId": "uuid"
}
```

---

### GET /api/cases/:id/history

Get case change history.

**Response:**

```json
{
  "status": "success",
  "data": {
    "history": [
      {
        "id": "uuid",
        "action": "STATUS_CHANGE",
        "oldValue": "REPORTED",
        "newValue": "IN_PROGRESS",
        "changedBy": { "name": "Worker" },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

## Teams (`/api/teams`)

### GET /api/teams

List teams in organization.

---

### POST /api/teams

Create a new team.

**Permissions:** `COORDINATOR+`

**Request:**

```json
{
  "name": "Team Alpha",
  "zoneId": "uuid",
  "leaderId": "uuid"
}
```

---

### POST /api/teams/:id/members

Add member to team.

**Request:**

```json
{
  "userId": "uuid"
}
```

---

## Zones (`/api/zones`)

### GET /api/zones

List geographic zones.

---

### POST /api/zones

Create a zone.

**Permissions:** `ORGANIZATION_ADMIN+`

**Request:**

```json
{
  "name": "Zona Norte",
  "coordinates": [
    { "lat": -31.4, "lng": -64.18 },
    { "lat": -31.41, "lng": -64.19 }
  ]
}
```

---

## Service Points (`/api/service-points`)

### GET /api/service-points/public

Get public service points (no auth required).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | HEALTH_CENTER, SOUP_KITCHEN, SHELTER, COMMUNITY_CENTER |
| lat | number | Center latitude |
| lng | number | Center longitude |
| radius | number | Radius in km |

---

### POST /api/service-points

Create a service point.

**Permissions:** `ORGANIZATION_ADMIN+` (NGO or Municipality only)

**Request:**

```json
{
  "name": "Comedor Solidario",
  "type": "SOUP_KITCHEN",
  "address": "Calle 123",
  "lat": -31.42,
  "lng": -64.19,
  "schedule": "Lun-Vie 12:00-15:00"
}
```

---

## Statistics (`/api/statistics`)

### GET /api/statistics/overview

Get dashboard overview.

**Permissions:** `statistics:view`

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalCases": 150,
    "activeCases": 45,
    "resolvedCases": 100,
    "totalHomeless": 200,
    "activeTeams": 5
  }
}
```

---

### GET /api/statistics/cases-by-status

Get cases grouped by status.

---

### GET /api/statistics/zones

Get statistics by zone.

---

## Sessions (`/api/sessions`)

### GET /api/sessions/my

List current user's active sessions.

**Response:**

```json
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "device": "Chrome on Windows",
        "ip": "192.168.1.1",
        "createdAt": "2025-01-01T00:00:00Z",
        "current": true
      }
    ]
  }
}
```

---

### DELETE /api/sessions/:id

Revoke a specific session.

---

### DELETE /api/sessions/all

Revoke all sessions except current.

---

## Audit (`/api/audit`)

### GET /api/audit

Get audit logs.

**Permissions:** `ADMIN` only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| action | string | Filter by action type |
| userId | uuid | Filter by user |
| startDate | date | From date |
| endDate | date | To date |

---

## Health (`/api/health`)

### GET /api/health

Health check (no auth).

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Multi-Tenancy

All endpoints (except public ones) automatically filter data by the user's `organizationId`. You cannot access data from other organizations unless you use SuperAdmin mode.

### SuperAdmin Headers

For cross-organization access (ADMIN role only):

```http
x-superadmin-secret: <your-secret>
x-superadmin-jti: <unique-uuid>
```

---

## Rate Limits

| Endpoint              | Limit | Window     |
| --------------------- | ----- | ---------- |
| POST /api/auth/login  | 5     | 1 hour     |
| POST /api/emergencies | 5     | 1 minute   |
| General API           | 100   | 15 minutes |
| SuperAdmin            | 3     | 1 minute   |

---

**Last Updated**: December 2025
**Version**: 1.0.0
