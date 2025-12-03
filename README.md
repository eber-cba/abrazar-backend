# Abrazar API Backend

Backend para la plataforma **Abrazar**, un sistema de gestión para asistencia social a personas en situación de calle.

## 📚 Documentación

Toda la documentación técnica y de configuración se encuentra en la carpeta `docs/`:

- **[Configuración Inicial (Setup)](docs/SETUP.md)**: Cómo instalar y ejecutar el proyecto.
- **[Base de Datos](docs/DATABASE.md)**: Guía de Prisma, migraciones y seeds.
- **[Docker](docs/DOCKER.md)**: Uso de contenedores para desarrollo y testing.
- **[API & Arquitectura](docs/API.md)**: Detalles técnicos de los módulos y autenticación.
- **[Arquitectura Técnica](docs/ARCHITECTURE.md)**: Visión profunda de la arquitectura del sistema.
- **[Guía de Código](docs/CODE_GUIDE.md)**: Guía para desarrolladores sobre la estructura del código.
- **[Testing](TESTING.md)**: Guía de ejecución de pruebas.
- **[Contribuir](CONTRIBUTING.md)**: Reglas para colaborar en el proyecto.

## 🚀 Inicio Rápido

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Configurar entorno**:

   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

3. **Levantar base de datos**:

   ```bash
   docker-compose up -d db redis
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

## 🛠️ Stack Tecnológico

- **Node.js** + **Express**
- **PostgreSQL** + **Prisma ORM**
- **Redis** + **BullMQ** (Colas de tareas)
- **Docker** (Contenerización)
- **Jest** (Testing)
