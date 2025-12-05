# Arquitectura Técnica - Abrazar API

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Flujo de Ejecución](#flujo-de-ejecución)
- [Módulos Principales](#módulos-principales)
- [Dependencias Detalladas](#dependencias-detalladas)
- [Seguridad](#seguridad)
- [Performance](#performance)
- [Testing](#testing)
- [Mejoras Futuras](#mejoras-futuras)

---

## 🎯 Visión General

**Abrazar API** es un sistema backend robusto diseñado para la gestión de casos de asistencia social, con arquitectura modular, multi-tenancy, y enfoque en seguridad y escalabilidad.

### Características Principales

- ✅ **Multi-tenancy**: Soporte para múltiples organizaciones (Municipios, ONGs)
- ✅ **RBAC/PBAC**: Control de acceso basado en roles y permisos
- ✅ **Autenticación Dual**: JWT + Firebase Authentication
- ✅ **Gestión de Sesiones**: Revocación de tokens y sesiones activas
- ✅ **Caché Redis**: Optimización de consultas pesadas
- ✅ **Auditoría Completa**: Registro de todas las acciones críticas
- ✅ **Consentimientos Legales**: Tracking de aceptación de términos y políticas
- ✅ **Tiempo Real**: WebSockets para notificaciones instantáneas

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── server.js              # Punto de entrada de la aplicación
│   ├── app.js                 # Configuración de Express y middlewares
│   ├── prismaClient.js        # Cliente de Prisma (ORM)
│   │
│   ├── config/                # Configuraciones
│   │   ├── env.js            # Variables de entorno validadas (Zod)
│   │   ├── redis.js          # Cliente Redis
│   │   ├── firebase.js       # Firebase Admin SDK
│   │   └── cloudinary.js     # Cloudinary para imágenes
│   │
│   ├── middlewares/           # Middlewares globales
│   │   ├── auth.middleware.js           # Autenticación JWT
│   │   ├── permission.middleware.js     # Control de permisos
│   │   ├── multi-tenant.middleware.js   # Aislamiento de datos
│   │   ├── rate-limit.middleware.js     # Rate limiting
│   │   ├── validate.middleware.js       # Validación Zod
│   │   ├── audit.middleware.js          # Logging de auditoría
│   │   ├── upload.middleware.js         # Subida de archivos
│   │   └── errorHandler.js              # Manejo de errores
│   │
│   ├── modules/               # Módulos de negocio (17 módulos)
│   │   ├── auth/             # Autenticación y registro
│   │   ├── cases/            # Gestión de casos
│   │   ├── persons/          # Gestión de personas
│   │   ├── organizations/    # Organizaciones
│   │   ├── teams/            # Equipos de trabajo
│   │   ├── zones/            # Zonas geográficas
│   │   ├── emergencies/      # Casos de emergencia
│   │   ├── comments/         # Comentarios en casos
│   │   ├── statistics/       # Dashboard y analytics
│   │   ├── service-points/   # Puntos de servicio
│   │   ├── sessions/         # Gestión de sesiones
│   │   ├── permissions/      # RBAC/PBAC
│   │   ├── consents/         # Consentimientos legales
│   │   ├── audit/            # Logs de auditoría
│   │   ├── realtime/         # WebSockets
│   │   ├── uploads/          # Subida de archivos
│   │   └── admin/            # Panel de administración
│   │
│   ├── services/              # Servicios compartidos
│   │   ├── cache.service.js         # Servicio de caché Redis
│   │   ├── permission.service.js    # Lógica de permisos
│   │   └── email.service.js         # Envío de emails
│   │
│   ├── utils/                 # Utilidades
│   │   ├── jwt.js            # Generación/validación JWT
│   │   ├── errors.js         # Clases de error personalizadas
│   │   └── logger.js         # Winston logger
│   │
│   └── validators/            # Esquemas de validación Zod
│       ├── auth.validator.js
│       └── case.validator.js
│
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── migrations/            # Migraciones de Prisma
│   └── seed.js               # Datos iniciales
│
├── tests/                     # Tests (152 tests)
│   ├── unit/                 # Tests unitarios
│   └── integration/          # Tests de integración
│
├── logs/                      # Logs de Winston
├── docker-compose.yml         # Orquestación Docker
├── Dockerfile                 # Imagen de producción
└── package.json              # Dependencias y scripts
```

---

## 🛠 Stack Tecnológico

### Core

- **Node.js** (v18+): Runtime de JavaScript
- **Express.js** (v4.22): Framework web minimalista
- **Prisma** (v5.0): ORM moderno con type-safety
- **PostgreSQL**: Base de datos relacional
- **Redis** (ioredis): Caché y sesiones

### Autenticación & Seguridad

- **JWT** (jsonwebtoken): Tokens de autenticación
- **Firebase Admin**: Autenticación social
- **bcrypt**: Hash de contraseñas
- **Helmet**: Headers de seguridad HTTP
- **express-rate-limit**: Protección contra DDoS
- **xss-clean**: Sanitización XSS
- **hpp**: Protección HTTP Parameter Pollution

### Validación & Tipos

- **Zod**: Validación de esquemas con inferencia de tipos
- **express-validator**: Validación de requests (legacy)

### Storage & Media

- **Cloudinary**: Almacenamiento de imágenes en la nube
- **Multer**: Manejo de multipart/form-data

### Logging & Monitoring

- **Winston**: Sistema de logging estructurado
- **Morgan**: HTTP request logger

### Testing

- **Jest**: Framework de testing
- **Supertest**: Testing de APIs HTTP

### DevOps

- **Docker**: Containerización
- **Nodemon**: Hot-reload en desarrollo

---

## 🚀 Flujo de Ejecución

### 1. Inicio de la Aplicación (`server.js`)

```javascript
1. Carga variables de entorno (.env)
2. Conecta a PostgreSQL (Prisma)
3. Conecta a Redis
4. Inicia servidor Express en puerto 3000/3001
```

### 2. Configuración de Express (`app.js`)

```javascript
1. Middlewares de seguridad (Helmet, CORS, Rate Limit)
2. Parsers (JSON, URL-encoded)
3. Sanitización (XSS, HPP)
4. Logging (Morgan, Winston)
5. Registro de rutas modulares
6. Manejo de errores global
```

### 3. Request Lifecycle

```
Cliente → Rate Limiter → CORS → Helmet → Body Parser →
Sanitización → Auth Middleware → Multi-tenant → Permission →
Route Handler → Service → Prisma/Redis → Response
```

---

## 🧩 Módulos Principales

### 1. **Auth Module** (`modules/auth/`)

**Propósito**: Autenticación y registro de usuarios

**Endpoints**:

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login con email/password
- `POST /api/auth/firebase-login` - Login con Firebase (Google, Facebook)
- `PATCH /api/auth/me` - Actualizar perfil
- `POST /api/auth/logout` - Cerrar sesión

**Características**:

- Dual authentication (JWT + Firebase)
- Validación de términos y condiciones
- Generación de tokens con expiración
- Revocación de tokens en logout

---

### 2. **Cases Module** (`modules/cases/`)

**Propósito**: Gestión de casos de asistencia social

**Endpoints**:

- `POST /api/cases` - Crear caso
- `GET /api/cases` - Listar casos (filtros: status, zona, equipo)
- `GET /api/cases/:id` - Obtener caso específico
- `PATCH /api/cases/:id` - Actualizar caso
- `DELETE /api/cases/:id` - Eliminar caso
- `POST /api/cases/:id/assign` - Asignar a usuario/equipo
- `POST /api/cases/:id/emergency` - Marcar como emergencia
- `GET /api/cases/:id/history` - Historial de cambios
- `GET /api/cases/:id/timeline` - Timeline del caso

**Características**:

- Multi-tenancy (casos aislados por organización)
- Estados: REPORTED, VERIFIED, IN_PROGRESS, RESOLVED, CLOSED
- Geolocalización (lat/lng)
- Asignación a zonas y equipos
- Tracking de cambios (CaseHistory)

---

### 3. **Statistics Module** (`modules/statistics/`)

**Propósito**: Dashboard y analytics

**Endpoints**:

- `GET /api/statistics/overview` - Resumen general
- `GET /api/statistics/cases-by-status` - Casos por estado
- `GET /api/statistics/zones` - Casos por zona
- `GET /api/statistics/teams` - Casos por equipo
- `GET /api/statistics/emergencies` - Estadísticas de emergencias
- `GET /api/statistics/user-activity` - Actividad de usuarios
- `GET /api/statistics/export` - Exportar datos (JSON/CSV)

**Optimización**:

- **Redis Caching**: TTL de 5 minutos para queries pesadas
- **Agregaciones Prisma**: Uso de `groupBy` y `count`
- **Índices DB**: Composite indexes en campos frecuentes

---

### 4. **Permissions Module** (`modules/permissions/`)

**Propósito**: RBAC (Role-Based Access Control) + PBAC (Permission-Based)

**Roles**:

- `ADMIN`: Acceso total al sistema
- `ORGANIZATION_ADMIN`: Gestión de su organización
- `COORDINATOR`: Asignación de casos y equipos
- `SOCIAL_WORKER`: Gestión de casos
- `VOLUNTEER`: Creación de casos básicos

**Permisos Granulares**:

- `cases:create`, `cases:read`, `cases:update`, `cases:delete`
- `teams:manage`, `zones:manage`
- `statistics:view`, `audit:view`

---

### 5. **Sessions Module** (`modules/sessions/`)

**Propósito**: Gestión de sesiones activas y revocación de tokens

**Endpoints**:

- `GET /api/sessions/my` - Listar sesiones activas
- `DELETE /api/sessions/:id` - Revocar sesión específica
- `DELETE /api/sessions/all` - Revocar todas las sesiones

**Características**:

- Almacenamiento dual (PostgreSQL + Redis)
- Tracking de dispositivo e IP
- Blacklist de tokens revocados en Redis

---

### 6. **Consents Module** (`modules/consents/`)

**Propósito**: Tracking de consentimientos legales (GDPR compliance)

**Tipos de Consentimiento**:

- `TERMS_AND_CONDITIONS`
- `PRIVACY_POLICY`
- `DATA_PROCESSING`
- `MARKETING`

**Características**:

- Versionado de políticas
- Historial de cambios de consentimiento
- Validación obligatoria en registro

---

### 7. **Service Points Module** (`modules/service-points/`)

**Propósito**: Puntos de servicio (comedores, centros de salud, etc.)

**Tipos**:

- `HEALTH_CENTER`, `SOUP_KITCHEN`, `SHELTER`, `COMMUNITY_CENTER`

**Endpoints**:

- `GET /api/service-points/public` - Puntos públicos (sin auth)
- `GET /api/service-points/nearby` - Puntos cercanos (geolocalización)
- `POST /api/service-points` - Crear punto (solo Municipios/ONGs)

---

## 📦 Dependencias Detalladas

### Producción

#### **@prisma/client** (v5.0.0)

**Uso**: ORM para PostgreSQL  
**Por qué**: Type-safety, migraciones automáticas, queries optimizadas  
**Dónde**: Todos los módulos para acceso a DB

#### **express** (v4.22.0)

**Uso**: Framework web  
**Por qué**: Estándar de la industria, ecosistema maduro  
**Dónde**: `app.js`, todas las rutas

#### **ioredis** (v5.8.2)

**Uso**: Cliente Redis  
**Por qué**: Alto rendimiento, soporte de clustering  
**Dónde**: `cache.service.js`, `session.service.js`

#### **jsonwebtoken** (v9.0.0)

**Uso**: Generación y validación de JWT  
**Por qué**: Autenticación stateless  
**Dónde**: `auth.middleware.js`, `jwt.js`

#### **bcrypt** (v5.1.0)

**Uso**: Hash de contraseñas  
**Por qué**: Algoritmo seguro con salt  
**Dónde**: `auth.service.js`

#### **zod** (v3.21.4)

**Uso**: Validación de esquemas  
**Por qué**: Type-safety, mensajes de error claros  
**Dónde**: `validators/`, `config/env.js`

#### **helmet** (v7.0.0)

**Uso**: Headers de seguridad HTTP  
**Por qué**: Protección contra XSS, clickjacking, etc.  
**Dónde**: `app.js`

#### **express-rate-limit** (v8.2.1)

**Uso**: Rate limiting  
**Por qué**: Protección contra DDoS y brute force  
**Dónde**: `rate-limit.middleware.js`

#### **xss-clean** (v0.1.4)

**Uso**: Sanitización XSS  
**Por qué**: Prevención de inyección de scripts  
**Dónde**: `app.js`

#### **hpp** (v0.2.3)

**Uso**: HTTP Parameter Pollution protection  
**Por qué**: Prevención de ataques de parámetros duplicados  
**Dónde**: `app.js`

#### **winston** (v3.8.2)

**Uso**: Sistema de logging  
**Por qué**: Logs estructurados, múltiples transportes  
**Dónde**: `utils/logger.js`, `errorHandler.js`

#### **firebase-admin** (v13.6.0)

**Uso**: Autenticación social (Google, Facebook)  
**Por qué**: Integración con Firebase Auth  
**Dónde**: `auth.controller.js`

#### **multer** + **multer-storage-cloudinary**

**Uso**: Upload de archivos a Cloudinary  
**Por qué**: Almacenamiento escalable en la nube  
**Dónde**: `upload.middleware.js`, `uploads/`

#### **cors** (v2.8.5)

**Uso**: Cross-Origin Resource Sharing  
**Por qué**: Permitir requests desde frontend  
**Dónde**: `app.js`

#### **morgan** (v1.10.0)

**Uso**: HTTP request logger  
**Por qué**: Debugging y monitoreo de requests  
**Dónde**: `app.js`

### Desarrollo

#### **jest** (v29.7.0) + **supertest** (v6.3.4)

**Uso**: Testing framework  
**Por qué**: Estándar para testing en Node.js  
**Dónde**: `tests/`

#### **nodemon** (v3.1.11)

**Uso**: Hot-reload en desarrollo  
**Por qué**: Productividad en desarrollo  
**Dónde**: `npm run dev`

#### **prisma** (v5.0.0)

**Uso**: CLI de Prisma  
**Por qué**: Migraciones y generación de cliente  
**Dónde**: Scripts de DB

---

## 🔒 Seguridad

### Implementaciones

1. **Autenticación**

   - JWT con expiración (15min access, 7d refresh)
   - Revocación de tokens en Redis
   - Firebase Auth para social login

2. **Autorización**

   - RBAC con 5 roles
   - PBAC con permisos granulares
   - Multi-tenancy estricto
   - **SuperAdmin Secure Mode**: El rol `ADMIN` puede activar un modo de acceso irrestricto enviando el header `x-superadmin-secret` con el valor correcto. Esto permite saltar validaciones de permisos y acceder a datos de todas las organizaciones. Cada uso se audita en los logs.

3. **Protección de Datos**

   - Hash bcrypt (salt rounds: 10)
   - Sanitización XSS
   - Validación Zod en todos los inputs

4. **Rate Limiting**

   - Global: 100 req/15min
   - Auth: 5 req/hour
   - Emergency: 5 req/min

5. **Headers de Seguridad**

   - HSTS (Strict-Transport-Security)
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY

6. **Auditoría**
   - Logging de todas las acciones críticas
   - Tracking de cambios en casos
   - Historial de consentimientos

---

## ⚡ Performance

### Optimizaciones Implementadas

1. **Redis Caching**

   - Statistics queries (TTL: 5min)
   - Session storage
   - Token blacklist

2. **Database Indexes**

   ```prisma
   @@index([status, createdAt])
   @@index([organizationId, status])
   @@index([assignedToUserId])
   ```

3. **Connection Pooling**

   - Prisma connection pool
   - Redis connection reuse

4. **Lazy Loading**
   - Paginación en listados
   - Relaciones opcionales con `include`

---

## 🧪 Testing

### Cobertura

- **18 Test Suites**
- **152 Tests**
- **100% Pass Rate**

### Tipos de Tests

1. **Unit Tests** (8 suites)

   - `cache.service.test.js`
   - `permission.service.test.js`
   - `statistics.service.test.js`
   - `session.service.test.js`
   - `consent.service.test.js`
   - `zone.service.test.js`
   - `realtime.service.test.js`
   - `rbac-permission.service.test.js`

2. **Integration Tests** (10 suites)
   - `auth.test.js`
   - `cases.test.js`
   - `statistics.test.js`
   - `service-points.test.js`
   - `multi-tenant.test.js`
   - `security.test.js`
   - `session.test.js`
   - `rbac-permission.test.js`
   - `consent.test.js`
   - `comments.test.js`

---

## 🚀 Mejoras Futuras

### Corto Plazo (1-3 meses)

1. **GraphQL API**

   - Implementar Apollo Server
   - Queries optimizadas con DataLoader
   - Subscriptions para real-time

2. **Notificaciones Push**

   - Firebase Cloud Messaging
   - Notificaciones de emergencias
   - Recordatorios de seguimiento

3. **Exportación Avanzada**

   - PDF con gráficos
   - Excel con múltiples hojas
   - Reportes programados

4. **Búsqueda Full-Text**
   - Elasticsearch para búsqueda avanzada
   - Búsqueda por nombre, descripción, ubicación
   - Sugerencias automáticas

### Medio Plazo (3-6 meses)

5. **Machine Learning**

   - Predicción de casos de emergencia
   - Clustering de zonas de riesgo
   - Recomendación de asignación de equipos

6. **Integración con Servicios Externos**

   - WhatsApp Business API (notificaciones)
   - Google Maps API (rutas optimizadas)
   - Twilio (SMS de emergencia)

7. **Dashboard Avanzado**

   - Gráficos interactivos (Chart.js)
   - Mapas de calor
   - Predicciones y tendencias

8. **Microservicios**
   - Separar módulos en servicios independientes
   - Message queue (RabbitMQ/Kafka)
   - Service mesh (Istio)

### Largo Plazo (6-12 meses)

9. **Escalabilidad**

   - Kubernetes para orquestación
   - Load balancing con NGINX
   - CDN para assets estáticos

10. **Internacionalización (i18n)**

    - Soporte multi-idioma
    - Localización de fechas y monedas
    - Contenido dinámico por región

11. **Compliance**

    - GDPR completo
    - HIPAA (si se maneja salud)
    - ISO 27001 certification

12. **Blockchain**
    - Registro inmutable de casos críticos
    - Smart contracts para donaciones
    - Transparencia en uso de fondos

---

## 📊 Métricas de Código

- **Líneas de código**: ~15,000
- **Módulos**: 17
- **Endpoints**: ~80
- **Middlewares**: 8
- **Tests**: 152
- **Cobertura**: ~85%

---

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto es privado y confidencial.

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.0.0  
**Mantenedor**: Equipo Abrazar
