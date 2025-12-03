/**
 * ========================================
 * CLIENTE DE BASE DE DATOS PRISMA
 * ========================================
 * 
 * Este archivo crea y exporta una única instancia del cliente Prisma.
 * 
 * ¿QUÉ ES PRISMA?
 * Prisma es un ORM (Object-Relational Mapping) moderno que nos permite
 * interactuar con PostgreSQL usando JavaScript en lugar de SQL directo.
 * 
 * ¿POR QUÉ UNA SOLA INSTANCIA? (Patrón Singleton)
 * - Evita múltiples conexiones a la base de datos
 * - Reutiliza el pool de conexiones
 * - Mejora el rendimiento
 * 
 * RELACIONES:
 * - Usado por: Todos los servicios y controladores
 * - Configurado por: prisma/schema.prisma
 * - Conectado en: server.js (prisma.$connect())
 * 
 * EJEMPLO DE USO:
 * ```javascript
 * const prisma = require('./prismaClient');
 * const users = await prisma.user.findMany();
 * ```
 */

// Importa la clase PrismaClient del paquete @prisma/client
const { PrismaClient } = require("@prisma/client");

// Crea una única instancia del cliente Prisma con configuración de pool
// Esta instancia será reutilizada en toda la aplicación
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configuración del pool de conexiones para evitar "too many clients"
  // Especialmente importante durante tests paralelos
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Exporta la instancia para que otros archivos la usen
module.exports = prisma;

