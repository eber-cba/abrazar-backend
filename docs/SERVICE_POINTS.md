# Documentación del Módulo de Puntos de Servicio (Service Points)

## Descripción General

El módulo de Puntos de Servicio permite a las organizaciones (Municipios y ONGs) gestionar ubicaciones físicas donde se ofrecen servicios de asistencia. Estos puntos pueden ser centros de salud, comedores, refugios, puntos de ducha, etc.

## Funcionalidades Principales

- **Gestión Multi-tenant**: Las organizaciones solo pueden gestionar sus propios puntos de servicio.
- **Visibilidad Pública**: Los puntos marcados como `isPublic` son visibles para cualquier usuario (incluso no autenticado) a través de la API pública.
- **Integración con Zonas**: Los puntos pueden estar asociados opcionalmente a una zona geográfica.
- **Auditoría**: Todas las acciones de creación, edición y eliminación quedan registradas.

## Modelo de Datos

El modelo `ServicePoint` incluye:

- `type`: Tipo de punto (HEALTH_CENTER, REFUGE, SOUP_KITCHEN, etc.)
- `name`, `description`, `address`: Información básica.
- `latitude`, `longitude`: Coordenadas geográficas.
- `openingHours`, `capacity`, `servicesOffered`: Detalles operativos.
- `organizationId`: Organización propietaria.
- `isPublic`: Visibilidad.

## API Endpoints

### Públicos

- `GET /api/service-points/public`: Obtiene todos los puntos de servicio públicos. Permite filtrar por tipo y zona.

### Privados (Requiere Autenticación)

- `POST /api/service-points`: Crea un nuevo punto de servicio. (Solo Admin de Organización o Coordinador).
- `GET /api/service-points`: Obtiene los puntos de servicio de la organización del usuario. (Admin Global ve todos).
- `GET /api/service-points/:id`: Obtiene detalles de un punto específico.
- `PATCH /api/service-points/:id`: Actualiza un punto de servicio.
- `DELETE /api/service-points/:id`: Elimina un punto de servicio.

## Permisos

- **Global Admin**: Acceso total a todos los puntos.
- **Organization Admin / Coordinator**: Gestión total de los puntos de su propia organización.
- **Volunteer / Social Worker**: Solo lectura de puntos de su organización (o públicos).
- **Public**: Solo lectura de puntos públicos.

## Pruebas

Se han implementado tests de integración en `tests/integration/service-points.test.js` cubriendo:

- Creación exitosa por Municipio y ONG.
- Bloqueo de creación para usuarios no autorizados.
- Filtrado correcto en endpoints públicos y privados.
- Aislamiento multi-tenant.
