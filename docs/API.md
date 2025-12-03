# 📡 API Documentation & Architecture

## Arquitectura

El backend sigue una arquitectura modular basada en **Controladores, Servicios y Rutas**.

```
src/
├── modules/           # Módulos funcionales
│   ├── auth/          # Autenticación
│   ├── homeless/      # Gestión de personas
│   ├── cases/         # Gestión de casos
│   └── ...
├── middlewares/       # Lógica intermedia (Auth, Uploads, Validation)
├── config/            # Configuración (Env, Logger, DB)
└── utils/             # Utilidades compartidas
```

## 🔐 Autenticación

El sistema usa **JWT (JSON Web Tokens)**.

### Flujo de Login

1. Cliente envía credenciales (`POST /api/auth/login`).
2. Servidor valida y devuelve `accessToken` (corta duración) y `refreshToken` (larga duración).
3. Cliente envía `accessToken` en el header `Authorization: Bearer <token>`.

### Roles y Permisos

- **Role-Based Access Control (RBAC)**: Middleware `restrictTo('ADMIN', 'VOLUNTEER')`.
- **Organization-Based**: Usuarios pertenecen a una Organización y solo ven datos permitidos.

## 📦 Módulos Principales

### 1. Homeless (Personas)

- Registro de personas en situación de calle.
- Geolocalización (`lat`, `lng`).
- Fotos (Cloudinary).

### 2. Service Points (Puntos de Servicio)

- Lugares de ayuda (Refugios, Hospitales).
- Sincronización con Google Places API.

### 3. Cases (Casos)

- Seguimiento de intervenciones sociales.
- Asignación a trabajadores sociales.
- Niveles de emergencia.

## 🛠️ Tecnologías

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **DB**: PostgreSQL
- **Cache/Queues**: Redis + BullMQ
- **Uploads**: Multer + Cloudinary
- **Testing**: Jest + Supertest
