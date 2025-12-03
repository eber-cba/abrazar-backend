const cron = require('node-cron');
const { addCleanupJob } = require('../queues');
const logger = require('../config/logger');

/**
 * Scheduler para limpieza
 * Ejecuta tareas de mantenimiento diariamente
 */
const cleanupScheduler = {
  task: null,

  /**
   * Inicia el scheduler
   * Cron: Todos los días a las 4:00 AM (0 4 * * *)
   */
  start: () => {
    logger.info('Starting cleanup scheduler (daily at 4:00 AM)...');
    
    // Programar tarea
    cleanupScheduler.task = cron.schedule('0 4 * * *', async () => {
      logger.info('Running scheduled system cleanup...');
      
      try {
        // 1. Limpiar sesiones expiradas
        await addCleanupJob('sessions');
        
        // 2. Limpiar tokens revocados
        await addCleanupJob('tokens');
        
        // 3. Limpiar cache obsoleto
        await addCleanupJob('cache');
        
        // 4. Limpiar logs antiguos (semanalmente, los domingos)
        const today = new Date();
        if (today.getDay() === 0) { // 0 = Domingo
          await addCleanupJob('logs');
          await addCleanupJob('history');
        }
        
        logger.info('Scheduled cleanup jobs created successfully');
      } catch (error) {
        logger.error('Error in cleanup scheduler:', error);
      }
    });
  },

  /**
   * Detiene el scheduler
   */
  stop: () => {
    if (cleanupScheduler.task) {
      cleanupScheduler.task.stop();
      logger.info('Cleanup scheduler stopped');
    }
  },
};

module.exports = cleanupScheduler;
