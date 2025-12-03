# Contributing to Abrazar

## Requisitos

- Node.js v18+
- Docker & Docker Compose
- Git

## Instalación

1. Clonar repositorio.
2. `cd abrazar`
3. `docker compose -f docker-compose.dev.yml up --build`

## Estructura

- `/api`: Backend (Express + Prisma).
- `/frontend`: Frontend (React + MUI).
- `/scripts`: Scripts de utilidad (db, deploy).

## Estilos de Código

- **JS/React**: Prettier + ESLint standard.
- **Commits**: Conventional Commits.
- **Nombres**:
  - Variables: `camelCase`
  - Componentes: `PascalCase`
  - Archivos: `kebab-case` (backend) / `PascalCase` (componentes frontend)

## Levantar Entorno

```bash
# Iniciar todo
docker compose -f docker-compose.dev.yml up

# Reiniciar solo API
docker compose -f docker-compose.dev.yml restart api
```
