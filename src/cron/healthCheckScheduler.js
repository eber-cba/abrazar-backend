const cron = require('node-cron');
const { getQueueStats } = require('../queues');
const logger = require('../config/logger');

/**
 * Scheduler para Health Checks
 * Verifica el estado del sistema periódicamente
 */
const healthCheckScheduler = {
  task: null,

  /**
   * Inicia el scheduler
   * Cron: Cada 5 minutos (*\/5 * * * *)
   */
  start: () => {
    logger.info('Starting health check scheduler (every 5 mins)...');
    
    // Programar tarea
    healthCheckScheduler.task = cron.schedule('*/5 * * * *', async () => {
      logger.debug('Running scheduled health check...');
      
      try {
        // Verificar estado de colas
        const queues = ['stats', 'email', 'cleanup', 'uploads'];
        const alerts = [];
        
        for (const queueName of queues) {
          const stats = await getQueueStats(queueName);
          
          // Alertar si hay muchos jobs fallidos
          if (stats.failed > 10) {
            alerts.push(`Queue ${queueName} has ${stats.failed} failed jobs`);
          }
          
          // Alertar si hay muchos jobs en espera (backlog)
          if (stats.waiting > 100) {
            alerts.push(`Queue ${queueName} has ${stats.waiting} waiting jobs (backlog)`);
          }
        }
        
        // Si hay alertas, loguearlas como error (podría enviar email a admin)
        if (alerts.length > 0) {
          logger.error('Health Check Alerts:', { alerts });
          // TODO: Enviar notificación a admin
        } else {
          logger.info('System health check passed');
        }
      } catch (error) {
        logger.error('Error in health check scheduler:', error);
      }
    });
  },

  /**
   * Detiene el scheduler
   */
  stop: () => {
    if (healthCheckScheduler.task) {
      healthCheckScheduler.task.stop();
      logger.info('Health check scheduler stopped');
    }
  },
};

module.exports = healthCheckScheduler;
