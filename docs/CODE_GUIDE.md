# 📚 Guía de Código - Abrazar Backend

## 🎯 Propósito de este Documento

Esta guía ayuda a cualquier programador a entender rápidamente la estructura del código, qué hace cada archivo y cómo se relacionan entre sí.

---

## 🚀 Punto de Entrada de la Aplicación

### `src/server.js` - **INICIO DE LA APLICACIÓN**

**Qué hace**: Este es el primer archivo que se ejecuta cuando inicias el backend.
**Responsabilidades**:

- Carga las variables de entorno (.env)
- Conecta a la base de datos PostgreSQL (Prisma)
- Inicia el servidor Express en el puerto configurado

**Relaciones**:

- Importa `app.js` (configuración de Express)
- Importa `prismaClient.js` (cliente de base de datos)

**Flujo**: `server.js` → `app.js` → Rutas → Controladores → Servicios → Base de Datos

---

## ⚙️ Configuración Principal

### `src/app.js` - **CONFIGURACIÓN DE EXPRESS**

**Qué hace**: Configura toda la aplicación Express con middlewares y rutas.
**Responsabilidades**:

- Aplica middlewares de seguridad (Helmet, CORS, Rate Limit)
- Configura parsers (JSON, URL-encoded)
- Sanitiza inputs (XSS, HPP)
- Registra todas las rutas de la API
- Maneja errores globalmente

**Middlewares aplicados en orden**:

1. Helmet (headers de seguridad)
2. CORS (cross-origin)
3. Rate Limiter (protección DDoS)
4. Body Parser (JSON)
5. XSS Clean (sanitización)
6. HPP (parameter pollution)
7. Morgan (HTTP logger)

**Relaciones**:

- Importa todas las rutas de `modules/*/routes.js`
- Usa middlewares de `middlewares/`
- Exporta la app para `server.js`

---

## 🗄️ Base de Datos

### `src/prismaClient.js` - **CLIENTE DE BASE DE DATOS**

**Qué hace**: Crea y exporta una única instancia del cliente Prisma.
**Por qué**: Evita múltiples conexiones a la base de datos (patrón Singleton).

**Relaciones**:

- Usado por todos los servicios y controladores
- Configurado por `prisma/schema.prisma`

---

## 📁 Estructura de Módulos

Cada módulo sigue el patrón **MVC (Model-View-Controller)**:

```
modules/[nombre]/
├── [nombre].routes.js     → Define endpoints HTTP
├── [nombre].controller.js → Maneja requests/responses
├── [nombre].service.js    → Lógica de negocio
└── [nombre].validator.js  → Validación de datos (opcional)
```

### Flujo de un Request:

```
Cliente HTTP Request
    ↓
Route (routes.js) - Define el endpoint
    ↓
Middleware (auth, permissions, validation)
    ↓
Controller (controller.js) - Procesa el request
    ↓
Service (service.js) - Lógica de negocio
    ↓
Prisma/Redis - Acceso a datos
    ↓
Service - Formatea respuesta
    ↓
Controller - Envía respuesta HTTP
    ↓
Cliente recibe Response
```

---

## 🔐 Módulos Principales

### 1. **Auth Module** (`modules/auth/`)

**Propósito**: Autenticación y registro de usuarios

**Archivos**:

- `auth.routes.js`: Endpoints de autenticación

  - `POST /api/auth/register` - Registro
  - `POST /api/auth/login` - Login
  - `POST /api/auth/firebase-login` - Login social
  - `PATCH /api/auth/me` - Actualizar perfil
  - `POST /api/auth/logout` - Cerrar sesión

- `auth.controller.js`: Maneja las peticiones HTTP

  - Valida datos de entrada
  - Llama a `auth.service.js`
  - Formatea respuestas

- `auth.service.js`: Lógica de autenticación

  - Hash de contraseñas (bcrypt)
  - Generación de JWT
  - Verificación de Firebase tokens
  - Creación de sesiones

- `auth.validator.js`: Esquemas Zod para validación
  - Valida email, password, términos aceptados

**Relaciones**:

- Usa `utils/jwt.js` para tokens
- Usa `modules/sessions/session.service.js` para sesiones
- Usa `middlewares/auth.middleware.js` para proteger rutas

---

### 2. **Cases Module** (`modules/cases/`)

**Propósito**: Gestión de casos de asistencia social

**Archivos**:

- `cases.routes.js`: Endpoints CRUD de casos
- `cases.controller.js`: Maneja requests
- `cases.service.js`: Lógica de negocio
  - Crear, leer, actualizar, eliminar casos
  - Asignar a usuarios/equipos
  - Marcar emergencias
  - Generar historial

**Estados de un Caso**:

```
REPORTED → VERIFIED → IN_PROGRESS → RESOLVED → CLOSED
```

**Relaciones**:

- Usa `modules/audit/audit.service.js` para logging
- Usa `modules/emergencies/emergency.service.js` para emergencias
- Relacionado con `modules/zones/` y `modules/teams/`

---

### 3. **Statistics Module** (`modules/statistics/`)

**Propósito**: Dashboard y analytics

**Archivos**:

- `statistics.routes.js`: Endpoints de estadísticas
- `statistics.controller.js`: Maneja requests
- `statistics.service.js`: Agregaciones y cálculos
  - Usa Prisma `groupBy` para agregaciones
  - Implementa caché Redis (TTL: 5min)

**Optimización**:

```javascript
// Patrón de caché
async getOverviewStats(orgId) {
  // 1. Buscar en caché
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  // 2. Si no existe, consultar DB
  const stats = await prisma.case.groupBy(...);

  // 3. Guardar en caché
  await cacheService.set(cacheKey, stats, 300); // 5min

  return stats;
}
```

**Relaciones**:

- Usa `services/cache.service.js` para Redis
- Lee datos de múltiples tablas (Cases, Users, Teams, Zones)

---

### 4. **Permissions Module** (`modules/permissions/`)

**Propósito**: RBAC (Role-Based Access Control)

**Roles del Sistema**:

- `ADMIN`: Acceso total
- `ORGANIZATION_ADMIN`: Gestión de su organización
- `COORDINATOR`: Asignación de casos
- `SOCIAL_WORKER`: Gestión de casos
- `VOLUNTEER`: Creación básica

**Archivos**:

- `permission.routes.js`: Gestión de permisos
- `permission.controller.js`: Maneja requests
- `permission.service.js`: Lógica de permisos
  - Verifica roles
  - Verifica permisos granulares
  - Asigna/revoca permisos

**Relaciones**:

- Usado por `middlewares/permission.middleware.js`
- Trabaja con tabla `Permission` y `RolePermission` en DB

---

### 5. **Sessions Module** (`modules/sessions/`)

**Propósito**: Gestión de sesiones activas

**Archivos**:

- `session.routes.js`: Endpoints de sesiones
- `session.controller.js`: Maneja requests
- `session.service.js`: Lógica de sesiones
  - Almacenamiento dual (PostgreSQL + Redis)
  - Revocación de tokens
  - Blacklist en Redis

**Flujo de Revocación**:

```
1. Usuario solicita logout
2. session.service.js marca sesión como inválida en DB
3. Agrega token a blacklist en Redis
4. auth.middleware.js verifica blacklist en cada request
```

**Relaciones**:

- Usado por `modules/auth/auth.service.js`
- Usa `config/redis.js` para caché

---

## 🛡️ Middlewares

### `middlewares/auth.middleware.js` - **AUTENTICACIÓN**

**Qué hace**: Verifica que el usuario esté autenticado

**Funciones**:

- `protect`: Requiere autenticación (verifica JWT)
- `optionalProtect`: Autenticación opcional

**Flujo**:

```
1. Extrae token del header Authorization
2. Verifica firma del JWT
3. Verifica que el token no esté revocado (Redis)
4. Busca usuario en DB
5. Adjunta usuario a req.user
```

**Usado en**: Todas las rutas protegidas

---

### `middlewares/permission.middleware.js` - **AUTORIZACIÓN**

**Qué hace**: Verifica que el usuario tenga permisos

**Funciones**:

- `requireRole(...roles)`: Requiere uno de los roles especificados
- `canViewCase`: Puede ver el caso
- `canEditCase`: Puede editar el caso
- `canAssignCase`: Puede asignar el caso

**Flujo**:

```
1. Verifica que req.user exista (ya autenticado)
2. Consulta permisos del usuario
3. Verifica si tiene el permiso requerido
4. Si no, retorna 403 Forbidden
```

**Relaciones**:

- Usa `services/permission.service.js`
- Aplicado después de `auth.middleware.js`

---

### `middlewares/multi-tenant.middleware.js` - **MULTI-TENANCY**

**Qué hace**: Aísla datos por organización

**Funciones**:

- `multiTenantMiddleware`: Adjunta organizationId al request
- `requireOrganization`: Requiere que el usuario tenga organización

**Flujo**:

```
1. Extrae organizationId del usuario autenticado
2. Adjunta a req.organizationId
3. Todos los queries usan este ID para filtrar
```

**Importancia**: Evita que una organización vea datos de otra

---

### `middlewares/rate-limit.middleware.js` - **RATE LIMITING**

**Qué hace**: Protege contra DDoS y brute force

**Limitadores**:

- `generalLimiter`: 100 req/15min (global)
- `authLimiter`: 5 req/hour (login/register)
- `emergencyLimiter`: 5 req/min (emergencias)
- `statisticsLimiter`: 30 req/15min (stats)

**Configuración**:

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests
  message: "Too many requests",
});
```

---

### `middlewares/validate.middleware.js` - **VALIDACIÓN**

**Qué hace**: Valida datos de entrada con Zod

**Función**:

- `validate(schema)`: Middleware factory que valida body/params/query

**Uso**:

```javascript
router.post(
  "/login",
  validate(loginSchema), // Valida antes del controller
  authController.login
);
```

---

### `middlewares/errorHandler.js` - **MANEJO DE ERRORES**

**Qué hace**: Captura y formatea todos los errores

**Tipos de Errores**:

- Errores operacionales (400, 404, 403, etc.)
- Errores de Prisma (DB)
- Errores de validación (Zod)
- Errores inesperados (500)

**Formato de Respuesta**:

```json
{
  "status": "fail" | "error",
  "message": "Descripción del error",
  "stack": "..." // solo en desarrollo
}
```

---

## 🔧 Servicios Compartidos

### `services/cache.service.js` - **CACHÉ REDIS**

**Qué hace**: Abstrae operaciones de Redis

**Métodos**:

- `get(key)`: Obtiene valor del caché
- `set(key, value, ttl)`: Guarda en caché con expiración
- `del(key)`: Elimina del caché
- `generateKey(prefix, id, suffix)`: Genera keys consistentes

**Uso**:

```javascript
const cacheKey = cacheService.generateKey("stats", orgId, "overview");
const cached = await cacheService.get(cacheKey);
if (!cached) {
  const data = await fetchFromDB();
  await cacheService.set(cacheKey, data, 300); // 5min
}
```

---

### `services/permission.service.js` - **LÓGICA DE PERMISOS**

**Qué hace**: Verifica permisos de usuarios

**Métodos**:

- `hasRole(userId, roles)`: Verifica si tiene uno de los roles
- `canViewCase(userId, caseId)`: Puede ver el caso
- `canEditCase(userId, caseId)`: Puede editar el caso

**Lógica**:

```javascript
// Ejemplo: canViewCase
async canViewCase(userId, caseId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const case = await prisma.case.findUnique({ where: { id: caseId } });

  // Admin puede ver todo
  if (user.role === 'ADMIN') return true;

  // Misma organización
  if (user.organizationId === case.organizationId) return true;

  return false;
}
```

---

## 🔑 Utilidades

### `utils/jwt.js` - **MANEJO DE JWT**

**Qué hace**: Genera y verifica tokens JWT

**Funciones**:

- `signToken(userId)`: Genera access token (15min)
- `signRefreshToken(userId)`: Genera refresh token (7d)
- `verifyToken(token)`: Verifica y decodifica token

---

### `utils/logger.js` - **LOGGING CON WINSTON**

**Qué hace**: Sistema de logging estructurado

**Niveles**:

- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `debug`: Debugging

**Transportes**:

- Console (desarrollo)
- Archivos (logs/error.log, logs/all.log)

---

### `utils/errors.js` - **CLASES DE ERROR**

**Qué hace**: Define errores personalizados

**Clases**:

- `AppError`: Error base de la aplicación
- Hereda de Error nativo de JavaScript

---

## 📊 Configuración

### `config/env.js` - **VARIABLES DE ENTORNO**

**Qué hace**: Valida y exporta variables de entorno

**Validación con Zod**:

```javascript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  // ...
});
```

**Beneficio**: Falla rápido si falta una variable crítica

---

### `config/redis.js` - **CLIENTE REDIS**

**Qué hace**: Configura y exporta cliente Redis

**Exports**:

- `redisClient`: Cliente principal
- `redisSubscriber`: Cliente para pub/sub

---

### `config/firebase.js` - **FIREBASE ADMIN**

**Qué hace**: Configura Firebase Admin SDK

**Uso**: Verificación de tokens de Google/Facebook login

---

## 🧪 Testing

### Estructura de Tests

```
tests/
├── unit/              # Tests de servicios aislados
│   ├── cache.service.test.js
│   ├── permission.service.test.js
│   └── statistics.service.test.js
└── integration/       # Tests de endpoints completos
    ├── auth.test.js
    ├── cases.test.js
    └── statistics.test.js
```

### Patrón de Test de Integración:

```javascript
describe("Auth Module", () => {
  beforeAll(async () => {
    // Limpiar DB
    await prisma.user.deleteMany();
  });

  it("should register a user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@test.com", password: "123456" });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});
```

---

## 🔄 Flujos Completos

### Flujo de Autenticación:

```
1. Usuario envía POST /api/auth/login
2. auth.routes.js recibe el request
3. validate.middleware.js valida email/password
4. authLimiter verifica rate limit
5. auth.controller.js procesa
6. auth.service.js:
   - Busca usuario en DB
   - Verifica password con bcrypt
   - Genera JWT con jwt.js
   - Crea sesión con session.service.js
7. Retorna token al cliente
```

### Flujo de Request Protegido:

```
1. Cliente envía GET /api/cases con header Authorization
2. cases.routes.js recibe
3. auth.middleware.js (protect):
   - Verifica JWT
   - Verifica que no esté en blacklist (Redis)
   - Adjunta user a req.user
4. multi-tenant.middleware.js:
   - Adjunta organizationId a req
5. permission.middleware.js:
   - Verifica que tenga permiso
6. cases.controller.js procesa
7. cases.service.js:
   - Filtra por organizationId (multi-tenancy)
   - Consulta DB
8. Retorna casos al cliente
```

---

## 📝 Convenciones de Código

### Nombres de Archivos:

- Rutas: `[nombre].routes.js`
- Controladores: `[nombre].controller.js`
- Servicios: `[nombre].service.js`
- Middlewares: `[nombre].middleware.js`

### Nombres de Funciones:

- Controladores: `async functionName(req, res, next)`
- Servicios: `async functionName(params)`

### Manejo de Errores:

```javascript
// En servicios
if (!user) {
  throw new AppError("User not found", 404);
}

// En controladores
try {
  const result = await service.method();
  res.status(200).json({ status: "success", data: result });
} catch (error) {
  next(error); // Pasa al errorHandler
}
```

---

## 🚀 Próximos Pasos para Nuevos Desarrolladores

1. **Leer**: README.md y ARCHITECTURE.md
2. **Configurar**: Variables de entorno (.env)
3. **Instalar**: `npm install`
4. **Migrar DB**: `npx prisma migrate dev`
5. **Ejecutar tests**: `npm test`
6. **Iniciar**: `npm run dev`
7. **Explorar**: Swagger en http://localhost:3000/api-docs

---

## 📞 Ayuda

Si tienes dudas sobre algún archivo o flujo:

1. Busca el archivo en esta guía
2. Lee los comentarios en el código
3. Revisa los tests relacionados
4. Consulta ARCHITECTURE.md para detalles técnicos

---

**Última actualización**: Diciembre 2025  
**Mantenido por**: Equipo Abrazar
