const cron = require('node-cron');
const { addStatsJob } = require('../queues');
const logger = require('../config/logger');
const prisma = require('../prismaClient');

/**
 * Scheduler para estadísticas
 * Ejecuta cálculos pesados periódicamente
 */
const statsScheduler = {
  task: null,

  /**
   * Inicia el scheduler
   * Cron: Cada 30 minutos (0 *\/30 * * * *)
   */
  start: () => {
    logger.info('Starting stats scheduler (every 30 mins)...');
    
    // Programar tarea
    statsScheduler.task = cron.schedule('0 */30 * * * *', async () => {
      logger.info('Running scheduled stats calculation...');
      
      try {
        // 1. Obtener todas las organizaciones activas
        const organizations = await prisma.organization.findMany({
          select: { id: true },
        });
        
        logger.info(`Scheduling stats calculation for ${organizations.length} organizations`);
        
        // 2. Crear jobs para cada organización
        for (const org of organizations) {
          await addStatsJob({
            organizationId: org.id,
            type: 'overview',
          });
          
          // Pequeña pausa para no saturar la cola instantáneamente
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        logger.info('Scheduled stats jobs created successfully');
      } catch (error) {
        logger.error('Error in stats scheduler:', error);
      }
    });
  },

  /**
   * Detiene el scheduler
   */
  stop: () => {
    if (statsScheduler.task) {
      statsScheduler.task.stop();
      logger.info('Stats scheduler stopped');
    }
  },
};

module.exports = statsScheduler;
