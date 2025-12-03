# CI/CD Pipeline Guide

Esta guía describe el flujo de Integración Continua y Despliegue Continuo (CI/CD) recomendado para Abrazar API.

## 🔄 Flujo de Trabajo (Workflow)

El pipeline debe ejecutarse en cada `push` a las ramas `develop` y `main`, y en cada Pull Request.

### Etapas del Pipeline

1.  **Lint & Format Check**

    - Verifica estilo de código y errores de sintaxis.
    - Comando: `npm run lint` (si existe) o verificación manual.

2.  **Unit & Integration Tests**

    - Ejecuta la suite completa de tests.
    - Comando: `npm test`
    - **Bloqueante**: Si falla, no se avanza.

3.  **Build Docker Image**

    - Construye la imagen de producción.
    - Tag: `abrazar-backend:${GITHUB_SHA}`

4.  **Container Test (Smoke Test)**

    - Levanta la imagen construida con docker-compose.
    - Ejecuta migraciones en DB temporal.
    - Verifica que el servidor responda (Health Check).

5.  **Push to Registry**

    - Sube la imagen a Docker Hub / ECR / GCR.
    - Tags: `latest`, `v1.0.x`

6.  **Deploy (Solo en rama main)**
    - Actualiza el servicio en el servidor de producción.
    - Ejecuta migraciones de base de datos.

## 🤖 Ejemplo GitHub Actions (.github/workflows/ci-cd.yml)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: abrazar_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install Dependencies
        run: npm ci --legacy-peer-deps

      - name: Run Tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/abrazar_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key-min-32-chars
          JWT_REFRESH_SECRET: test-refresh-secret-key-min-32-chars
          CLOUDINARY_CLOUD_NAME: mock
          CLOUDINARY_API_KEY: mock
          CLOUDINARY_API_SECRET: mock
          FIREBASE_PROJECT_ID: mock
          FIREBASE_CLIENT_EMAIL: mock@test.com
          FIREBASE_PRIVATE_KEY: mock-key
        run: |
          npx prisma generate
          npx prisma migrate deploy
          npm test

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            user/abrazar-backend:latest
            user/abrazar-backend:${{ github.sha }}

  deploy:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/abrazar
            docker-compose pull
            docker-compose up -d
            docker run --rm --env-file .env.production user/abrazar-backend:latest npx prisma migrate deploy
```

## 🛡️ Rollback

Si un despliegue falla:

1.  **Identificar versión anterior estable**:
    Revisa el historial de tags en Docker Hub.

2.  **Revertir en docker-compose.prod.yml**:
    Cambia `image: abrazar-backend:latest` por `image: abrazar-backend:<hash-anterior>`.

3.  **Redesplegar**:
    `docker-compose up -d`

4.  **Revertir Migraciones (si es necesario)**:
    Si hubo cambios en la BD que rompen la versión anterior, deberás revertirlos manualmente usando `prisma migrate resolve` con cuidado.
