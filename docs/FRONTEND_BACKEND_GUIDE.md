# 📱 Frontend-Backend Integration Guide

## Introduction

This guide provides everything a frontend developer needs to integrate with the Abrazar Backend API. It covers authentication, API consumption, error handling, and role-based UI considerations.

---

## Part 1: Backend Architecture Overview

### Technology Stack

| Component | Technology              |
| --------- | ----------------------- |
| Runtime   | Node.js 18+             |
| Framework | Express.js              |
| Database  | PostgreSQL (Prisma ORM) |
| Cache     | Redis                   |
| Auth      | JWT + Firebase          |
| Hosting   | Railway                 |

### Core Concepts

#### Multi-Tenancy

The backend isolates data by organization. Each user belongs to one organization, and they can only see data within their organization.

```
User → Organization → [Cases, Homeless, Teams, Zones]
```

**Exception**: SuperAdmin mode allows cross-organization access.

#### Role-Based Access Control (RBAC)

Users have one of 5 roles determining what they can do:

```
ADMIN > ORGANIZATION_ADMIN > COORDINATOR > SOCIAL_WORKER > VOLUNTEER
```

---

## Part 2: Authentication Flow

### 2.1 Login

```typescript
// POST /api/auth/login
const login = async (email: string, password: string) => {
  const response = await fetch("https://api.abrazar.org/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    // Store tokens
    localStorage.setItem("accessToken", data.data.token);
    localStorage.setItem("refreshToken", data.data.refreshToken);

    // Store user info
    localStorage.setItem("user", JSON.stringify(data.data.user));

    return data.data;
  }

  throw new Error(data.message);
};
```

**Response Structure:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "ADMIN",
      "organizationId": "uuid",
      "organization": {
        "id": "uuid",
        "name": "Sample Org",
        "type": "NGO"
      }
    },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### 2.2 Token Persistence

```typescript
// utils/auth.ts
export const getToken = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");
export const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

export const isAuthenticated = () => !!getToken();

export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};
```

### 2.3 Token Refresh

Tokens expire after 15 minutes. Implement automatic refresh:

```typescript
// utils/api.ts
export const refreshTokens = async () => {
  const refreshToken = getRefreshToken();

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    logout();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await response.json();
  localStorage.setItem("accessToken", data.data.token);
  return data.data.token;
};
```

### 2.4 Axios Interceptor (Recommended)

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "https://api.abrazar.org/api",
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshTokens();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      } catch {
        logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2.5 Logout

```typescript
const handleLogout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (e) {
    // Ignore errors - logout anyway
  }
  logout();
  window.location.href = "/login";
};
```

---

## Part 3: API Endpoints Reference

### Authentication

| Method | Endpoint               | Description               | Auth |
| ------ | ---------------------- | ------------------------- | ---- |
| POST   | `/auth/login`          | Login with email/password | ❌   |
| POST   | `/auth/register`       | Create new account        | ❌   |
| POST   | `/auth/firebase-login` | Login with Firebase       | ❌   |
| PATCH  | `/auth/me`             | Update profile            | ✅   |
| POST   | `/auth/logout`         | End session               | ✅   |

### Homeless (Persons)

| Method | Endpoint        | Description | Role           |
| ------ | --------------- | ----------- | -------------- |
| GET    | `/homeless`     | List all    | Any            |
| POST   | `/homeless`     | Create      | Any            |
| GET    | `/homeless/:id` | Get one     | Any            |
| PATCH  | `/homeless/:id` | Update      | SOCIAL_WORKER+ |
| DELETE | `/homeless/:id` | Delete      | ORG_ADMIN+     |

### Cases

| Method | Endpoint             | Description  | Role           |
| ------ | -------------------- | ------------ | -------------- |
| GET    | `/cases`             | List cases   | Any            |
| POST   | `/cases`             | Create case  | Any            |
| GET    | `/cases/:id`         | Get case     | Any            |
| PATCH  | `/cases/:id`         | Update case  | SOCIAL_WORKER+ |
| DELETE | `/cases/:id`         | Delete case  | ORG_ADMIN+     |
| POST   | `/cases/:id/assign`  | Assign case  | COORDINATOR+   |
| GET    | `/cases/:id/history` | Case history | Any            |

### Service Points

| Method | Endpoint                 | Description | Auth       |
| ------ | ------------------------ | ----------- | ---------- |
| GET    | `/service-points/public` | Public list | ❌         |
| GET    | `/service-points`        | Org list    | ✅         |
| POST   | `/service-points`        | Create      | ORG_ADMIN+ |

### Teams

| Method | Endpoint     | Description | Role         |
| ------ | ------------ | ----------- | ------------ |
| GET    | `/teams`     | List teams  | Any          |
| POST   | `/teams`     | Create team | COORDINATOR+ |
| PATCH  | `/teams/:id` | Update team | COORDINATOR+ |

### Zones

| Method | Endpoint | Description | Role       |
| ------ | -------- | ----------- | ---------- |
| GET    | `/zones` | List zones  | Any        |
| POST   | `/zones` | Create zone | ORG_ADMIN+ |

### Statistics

| Method | Endpoint                      | Description | Role |
| ------ | ----------------------------- | ----------- | ---- |
| GET    | `/statistics/overview`        | Dashboard   | Any  |
| GET    | `/statistics/cases-by-status` | By status   | Any  |
| GET    | `/statistics/zones`           | By zone     | Any  |

### Sessions

| Method | Endpoint        | Description      |
| ------ | --------------- | ---------------- |
| GET    | `/sessions/my`  | List my sessions |
| DELETE | `/sessions/:id` | Revoke session   |
| DELETE | `/sessions/all` | Revoke all       |

---

## Part 4: Error Handling

### Error Response Format

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning           | Action                         |
| ---- | ----------------- | ------------------------------ |
| 400  | Bad Request       | Show validation errors to user |
| 401  | Unauthorized      | Redirect to login              |
| 403  | Forbidden         | Show "Access Denied" message   |
| 404  | Not Found         | Show "Not Found" page          |
| 429  | Too Many Requests | Show "Please wait" message     |
| 500  | Server Error      | Show "Something went wrong"    |

### Global Error Handler

```typescript
const handleApiError = (error: AxiosError) => {
  const status = error.response?.status;
  const data = error.response?.data as any;

  switch (status) {
    case 400:
      // Validation error - show field errors
      return {
        type: "validation",
        message: data.message,
        errors: data.errors || [],
      };

    case 401:
      // Session expired - redirect to login
      logout();
      window.location.href = "/login";
      return { type: "auth", message: "Session expired" };

    case 403:
      // Permission denied
      return {
        type: "permission",
        message: data.message || "You don't have permission",
      };

    case 429:
      // Rate limited
      return {
        type: "ratelimit",
        message: "Too many requests. Please wait.",
      };

    default:
      return {
        type: "error",
        message: "Something went wrong. Please try again.",
      };
  }
};
```

---

## Part 5: Role-Based UI

### UI by Role

#### VOLUNTEER

| Feature            | Access |
| ------------------ | ------ |
| View homeless list | ✅     |
| Register homeless  | ✅     |
| Create basic case  | ✅     |
| View own cases     | ✅     |
| Edit cases         | ❌     |
| View statistics    | ❌     |
| Manage teams       | ❌     |

**UI Considerations:**

- Hide edit/delete buttons
- Show "View Only" badges
- Disable admin menu items

#### SOCIAL_WORKER

| Feature                | Access |
| ---------------------- | ------ |
| All VOLUNTEER features | ✅     |
| Edit homeless profiles | ✅     |
| Update cases           | ✅     |
| Add comments           | ✅     |
| View case history      | ✅     |

#### COORDINATOR

| Feature                    | Access |
| -------------------------- | ------ |
| All SOCIAL_WORKER features | ✅     |
| Assign cases to users      | ✅     |
| Create/manage teams        | ✅     |
| View zone statistics       | ✅     |

#### ORGANIZATION_ADMIN

| Feature                  | Access |
| ------------------------ | ------ |
| All COORDINATOR features | ✅     |
| Delete records           | ✅     |
| Create zones             | ✅     |
| View all statistics      | ✅     |
| Manage service points    | ✅     |
| Manage users             | ✅     |

#### ADMIN

| Feature                       | Access |
| ----------------------------- | ------ |
| All ORG_ADMIN features        | ✅     |
| Cross-org access (SuperAdmin) | ✅     |
| System settings               | ✅     |
| Audit logs                    | ✅     |

### Permission Checking

```typescript
// utils/permissions.ts
type Role =
  | "ADMIN"
  | "ORGANIZATION_ADMIN"
  | "COORDINATOR"
  | "SOCIAL_WORKER"
  | "VOLUNTEER";

const roleHierarchy: Role[] = [
  "VOLUNTEER",
  "SOCIAL_WORKER",
  "COORDINATOR",
  "ORGANIZATION_ADMIN",
  "ADMIN",
];

export const hasRole = (userRole: Role, requiredRole: Role): boolean => {
  const userIndex = roleHierarchy.indexOf(userRole);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  return userIndex >= requiredIndex;
};

export const canEdit = (userRole: Role) => hasRole(userRole, "SOCIAL_WORKER");
export const canDelete = (userRole: Role) =>
  hasRole(userRole, "ORGANIZATION_ADMIN");
export const canManageTeams = (userRole: Role) =>
  hasRole(userRole, "COORDINATOR");
export const isAdmin = (userRole: Role) => userRole === "ADMIN";
```

### Conditional Rendering (React)

```tsx
// components/ProtectedComponent.tsx
const ProtectedComponent = ({ children, requiredRole }: Props) => {
  const user = useUser();

  if (!hasRole(user.role, requiredRole)) {
    return null; // or <AccessDenied />
  }

  return <>{children}</>;
};

// Usage
<ProtectedComponent requiredRole="ORGANIZATION_ADMIN">
  <DeleteButton onClick={handleDelete} />
</ProtectedComponent>;
```

---

## Part 6: SuperAdmin Mode

> ⚠️ **CRITICAL**: SuperAdmin headers should NEVER be sent from the frontend!

SuperAdmin mode is for backend-to-backend communication or admin CLI tools only. The frontend should never:

- Store the SuperAdmin secret
- Send `x-superadmin-secret` headers
- Attempt to bypass permissions

If a user needs cross-organization access, they should switch organizations through the proper UI flow.

---

## Part 7: Production Considerations

### 1. Never Expose Secrets

```typescript
// ❌ NEVER DO THIS
const headers = {
  "x-superadmin-secret": process.env.SUPERADMIN_SECRET,
};

// ✅ Correct - let backend handle permissions
const headers = {
  Authorization: `Bearer ${token}`,
};
```

### 2. Handle 401 Gracefully

```typescript
// Always check for 401 and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = "/login?expired=true";
    }
    return Promise.reject(error);
  }
);
```

### 3. Handle 403 With Context

```typescript
// Show why access was denied
if (error.response?.status === 403) {
  const message = error.response.data.message;

  if (message.includes("permission")) {
    showToast("You don't have permission for this action");
  } else if (message.includes("organization")) {
    showToast("This resource belongs to another organization");
  } else if (message.includes("SuperAdmin")) {
    // SuperAdmin required - this should never happen normally
    showToast("This action requires elevated privileges");
  }
}
```

### 4. Handle 429 Rate Limits

```typescript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers["retry-after"] || 60;
  showToast(`Please wait ${retryAfter} seconds before trying again`);
}
```

### 5. Detect Role Changes

If an admin changes a user's role while they're logged in:

```typescript
// Periodically verify session
const checkSession = async () => {
  try {
    const response = await api.get("/auth/me");
    const currentRole = getUser().role;
    const newRole = response.data.data.user.role;

    if (currentRole !== newRole) {
      // Role changed - update local state and refresh UI
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
      window.location.reload();
    }
  } catch (error) {
    if (error.response?.status === 401) {
      logout();
    }
  }
};

// Check every 5 minutes
setInterval(checkSession, 5 * 60 * 1000);
```

---

## Part 8: Example Implementations

### Fetching Homeless List

```typescript
const useHomeless = () => {
  const [homeless, setHomeless] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/homeless", {
          params: { page: 1, limit: 20 },
        });
        setHomeless(response.data.data.homeless);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { homeless, loading, error };
};
```

### Creating a Case

```typescript
const createCase = async (homelessId: string, description: string) => {
  try {
    const response = await api.post("/cases", {
      homelessId,
      description,
      priority: "MEDIUM",
    });

    showToast("Case created successfully");
    return response.data.data.case;
  } catch (error) {
    const err = handleApiError(error);
    showToast(err.message);
    throw error;
  }
};
```

### Real-time Updates (WebSocket)

```typescript
// Connect to WebSocket for real-time updates
const socket = io("wss://api.abrazar.org", {
  auth: { token: getToken() },
});

socket.on("case:updated", (data) => {
  // Update local state
  updateCase(data.caseId, data.changes);
});

socket.on("emergency:created", (data) => {
  // Show emergency notification
  showEmergencyAlert(data);
});
```

---

## Part 9: Environment Configuration

### Frontend Environment Variables

```env
# .env.production
VITE_API_URL=https://abrazar-backend.up.railway.app/api
VITE_WS_URL=wss://abrazar-backend.up.railway.app

# .env.development
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### API Client Configuration

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

---

## Quick Reference

### Request Headers

| Header          | Value              | Required                 |
| --------------- | ------------------ | ------------------------ |
| `Content-Type`  | `application/json` | Always                   |
| `Authorization` | `Bearer <token>`   | For authenticated routes |

### Common Query Parameters

| Param   | Type         | Usage          |
| ------- | ------------ | -------------- |
| `page`  | number       | Pagination     |
| `limit` | number       | Items per page |
| `sort`  | string       | Sort field     |
| `order` | `asc`/`desc` | Sort order     |

### Response Codes Summary

| Code | Meaning                           |
| ---- | --------------------------------- |
| 200  | Success                           |
| 201  | Created                           |
| 400  | Validation Error                  |
| 401  | Not Logged In → Redirect to Login |
| 403  | No Permission → Show Error        |
| 404  | Not Found → Show 404 Page         |
| 429  | Rate Limited → Show Wait Message  |
| 500  | Server Error → Show Generic Error |

---

**Last Updated**: December 2025
**Backend Version**: 1.0.0
**Contact**: Backend Team
