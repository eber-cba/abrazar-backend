# 🗄️ Base de Datos (PostgreSQL + Prisma)

Abrazar utiliza **Prisma ORM** para interactuar con PostgreSQL.

## Comandos Comunes

### Migraciones

Cada vez que cambies `prisma/schema.prisma`, debes crear una migración:

```bash
# Crear y aplicar migración
npx prisma migrate dev --name nombre_del_cambio
```

### Prisma Studio (GUI)

Para ver y editar los datos visualmente en el navegador:

```bash
npx prisma studio
```

Se abrirá en `http://localhost:5555`.

## 🌱 Seeding (Datos de Prueba)

El proyecto incluye un script de "semilla" (`prisma/seed.js`) que carga datos iniciales:

- Roles y Permisos
- Usuarios Admin y Voluntarios
- Organizaciones (Municipalidad, ONG)
- Categorías de Puntos de Servicio

Para ejecutarlo manualmente:

```bash
npx prisma db seed
```

## 🔄 Resetear Base de Datos

Si quieres borrar TODO y empezar de cero (útil en desarrollo):

```bash
# Borra la BD, aplica migraciones y corre el seed
npx prisma migrate reset
```

**¡CUIDADO!** Esto elimina todos los datos irreversiblemente.

## 📊 Esquema de Datos

El archivo `prisma/schema.prisma` es la fuente de verdad. Modelos principales:

- **User**: Usuarios del sistema (Voluntarios, Admins).
- **Organization**: Entidades (Municipalidades, ONGs).
- **Homeless**: Personas en situación de calle.
- **ServicePoint**: Puntos de ayuda (Refugios, Comedores).
- **Case**: Casos de seguimiento social.
