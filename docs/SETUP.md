# 🛠️ Configuración del Servidor (Setup)

Guía paso a paso para configurar y ejecutar el backend de Abrazar en tu entorno local.

## Prerrequisitos

- **Node.js**: v18 o superior
- **Docker**: Para ejecutar la base de datos y servicios auxiliares (Redis)
- **Git**: Para clonar el repositorio

## 1. Instalación

```bash
# Clonar el repositorio
git clone https://github.com/eber-cba/abrazar.git
cd abrazar/backend

# Instalar dependencias
npm install
```

## 2. Variables de Entorno

Copia el archivo de ejemplo y configúralo:

```bash
cp .env.example .env
```

### Variables Clave

- `DATABASE_URL`: URL de conexión a PostgreSQL.
- `JWT_SECRET`: Clave para firmar tokens (cámbiala en producción).
- `CLOUDINARY_*`: Credenciales para subida de imágenes.
- `GOOGLE_MAPS_API_KEY`: Para geolocalización (usa "mock" para desarrollo).
- `EMAIL_*`: Credenciales para envío de correos.

## 3. Base de Datos (Docker)

Levanta los servicios de infraestructura (PostgreSQL + Redis) sin iniciar la app aún:

```bash
docker-compose up -d db redis
```

Ejecuta las migraciones y el seed (datos de prueba):

```bash
# Migraciones (crear tablas)
npx prisma migrate dev

# Seed (llenar datos iniciales)
npx prisma db seed
```

## 4. Ejecutar el Servidor

### Modo Desarrollo (con Hot Reload)

```bash
npm run dev
```

El servidor iniciará en `http://localhost:5000`.

### Modo Producción

```bash
npm start
```

## 5. Verificación

Visita `http://localhost:5000/api/health` para verificar que el sistema está funcionando. Deberías ver:

```json
{
  "status": "success",
  "message": "Server is healthy",
  "timestamp": "..."
}
```
