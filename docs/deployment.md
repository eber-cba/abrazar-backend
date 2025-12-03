# Guía de Despliegue - Abrazar API

Esta guía detalla los pasos para desplegar el backend de Abrazar en un entorno de producción utilizando Docker.

## 📋 Prerrequisitos

- **Docker Engine** (v20.10+)
- **Docker Compose** (v2.0+)
- Acceso a un registro de contenedores (Docker Hub, AWS ECR, etc.)
- Servidor Linux (Ubuntu 22.04 recomendado) con al menos 2GB RAM

## 🚀 Despliegue con Docker Compose

### 1. Preparar Archivos

Crea un directorio en tu servidor y copia los siguientes archivos:

- `docker-compose.prod.yml` (ver ejemplo abajo)
- `.env.production`

### 2. Configurar Variables de Entorno (.env.production)

```env
# Servidor
NODE_ENV=production
PORT=3000

# Base de Datos
DATABASE_URL=postgresql://user:password@db_host:5432/abrazar_prod
REDIS_URL=redis://redis_host:6379

# Seguridad (JWT)
JWT_SECRET=tu_secreto_super_seguro_min_32_chars
JWT_REFRESH_SECRET=tu_otro_secreto_super_seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Servicios Externos
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Opcional (Mock mode si se omite)
GOOGLE_MAPS_API_KEY=tu_google_maps_key
```

### 3. Archivo docker-compose.prod.yml

```yaml
version: "3.8"

services:
  api:
    image: abrazar-backend:prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - redis
      # - db (si usas DB local en contenedor)
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 4. Iniciar Servicios

```bash
# Descargar imagen más reciente
docker-compose -f docker-compose.prod.yml pull

# Iniciar contenedores en segundo plano
docker-compose -f docker-compose.prod.yml up -d

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔄 Migraciones de Base de Datos

Las migraciones **NO** se ejecutan automáticamente al iniciar el contenedor para evitar conflictos en despliegues escalados. Debes ejecutarlas manualmente o en tu pipeline de CI/CD.

```bash
# Ejecutar migraciones en un contenedor efímero
docker run --rm --env-file .env.production abrazar-backend:prod npx prisma migrate deploy
```

## 📈 Estrategias de Escalado

### Réplicas

El servicio está diseñado para ser stateless (sin estado). Puedes escalar horizontalmente aumentando el número de réplicas en `docker-compose.prod.yml` o usando orquestadores como Kubernetes.

### Redis

Redis es fundamental para gestionar:

- Colas de trabajos (BullMQ)
- Caché de estadísticas
- Rate limiting

Asegúrate de que la instancia de Redis sea persistente y tenga suficiente memoria.

## 🛠️ Mantenimiento y Monitoreo

### Health Checks

El contenedor expone un endpoint raíz `/` que devuelve 200 OK si el servicio está saludable. Docker usa esto para reiniciar contenedores trabados.

### Logs

Los logs se escriben en `stdout/stderr` en formato JSON (Winston). Se recomienda usar un agregador de logs como ELK Stack, Datadog o CloudWatch.

### Backup

Realiza backups periódicos de tu base de datos PostgreSQL. Redis no requiere backup crítico si solo se usa para caché y colas volátiles.
