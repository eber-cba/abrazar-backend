# 🐳 Guía de Docker

Abrazar utiliza Docker para garantizar que el entorno de desarrollo sea idéntico al de producción y para facilitar el testing.

## Comandos Principales

### 🚀 Iniciar Servicios

```bash
# Levantar todo (App + DB + Redis) en segundo plano
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f backend
```

### 🛑 Detener Servicios

```bash
# Detener contenedores
docker-compose stop

# Detener y eliminar contenedores (sin borrar datos de BD)
docker-compose down
```

### 🧹 Limpieza Total

```bash
# Borrar contenedores Y volúmenes (¡BORRA LA BASE DE DATOS!)
docker-compose down -v
```

## 🧪 Testing en Docker

Para ejecutar los tests en un entorno aislado:

```bash
# Ejecutar todos los tests
./scripts/test-docker.sh

# O manualmente:
docker-compose exec backend npm test
```

## 🛠️ Acceso al Contenedor

Si necesitas entrar a la terminal del servidor:

```bash
docker-compose exec backend sh
```

## ⚠️ Solución de Problemas (Troubleshooting)

### Error: "Port already in use"

Si el puerto 5000 o 5432 está ocupado:

1. Detén otros servicios que usen esos puertos.
2. O cambia los puertos en `docker-compose.yml`.

### Error de Conexión a BD

Si la app no conecta a la base de datos:

1. Asegúrate de que el contenedor `db` esté "healthy": `docker ps`
2. Verifica que `DATABASE_URL` en `.env` apunte a `db:5432` (dentro de Docker) o `localhost:5432` (fuera de Docker).

### Reiniciar desde cero

Si todo falla y quieres limpiar el entorno:

```bash
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
npx prisma db seed
```
