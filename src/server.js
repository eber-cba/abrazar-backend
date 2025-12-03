/**
 * ========================================
 * PUNTO DE ENTRADA DE LA APLICACIÓN
 * ========================================
 * 
 * Este es el primer archivo que se ejecuta cuando inicias el backend.
 * 
 * RESPONSABILIDADES:
 * - Cargar variables de entorno desde .env
 * - Conectar a la base de datos PostgreSQL (Prisma)
 * - Iniciar el servidor Express en el puerto configurado
 * 
 * FLUJO DE EJECUCIÓN:
 * 1. Carga .env → config/env.js valida las variables
 * 2. Importa app.js (configuración de Express)
 * 3. Conecta a PostgreSQL con Prisma
 * 4. Inicia servidor HTTP en puerto 3000/3001
 * 
 * RELACIONES:
 * - Importa: app.js (configuración Express)
 * - Importa: prismaClient.js (cliente de base de datos)
 * - Usado por: npm start / npm run dev
 */

// Carga variables de entorno desde archivo .env
// Debe ser lo primero para que estén disponibles en toda la app
require('dotenv').config();

// Validar variables de entorno requeridas
const validateEnv = require('./config/validateEnv');
validateEnv();

// Importa la aplicación Express configurada (middlewares, rutas, etc.)
const app = require('./app');

// Importa el cliente Prisma (ORM para PostgreSQL)
const prisma = require('./prismaClient');

const schedulers = require('./cron');

// Puerto del servidor (desde .env o 3001 por defecto)
const PORT = process.env.PORT || 3001;

/**
 * Función asíncrona que inicia el servidor
 * 
 * PASOS:
 * 1. Conecta a PostgreSQL con Prisma
 * 2. Inicia los schedulers (cron jobs)
 * 3. Si la conexión es exitosa, inicia el servidor HTTP
 * 4. Si hay error, muestra el error y termina el proceso
 */
async function startServer() {
  try {
    // Conectar a la base de datos PostgreSQL
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Iniciar Schedulers (Cron Jobs)
    schedulers.startSchedulers();
    console.log('⏰ Schedulers started');
    
    // Iniciar servidor Express en el puerto configurado
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
    // Graceful Shutdown
    const shutdown = async () => {
      console.log('🛑 Shutting down server...');
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      schedulers.stopSchedulers();
      await prisma.$disconnect();
      console.log('Database disconnected');
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    // Si hay error al conectar a DB o iniciar servidor, mostrar error y salir
    console.error('❌ Error starting server:', error);
    process.exit(1); // Código 1 = error
  }
}

// Ejecutar la función de inicio
startServer();
