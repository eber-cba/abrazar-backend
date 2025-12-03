const statsScheduler = require('./statsScheduler');
const cleanupScheduler = require('./cleanupScheduler');
const healthCheckScheduler = require('./healthCheckScheduler');
const logger = require('../config/logger');

/**
 * Registro de Schedulers
 * Centraliza el manejo de todas las tareas programadas
 */
const schedulers = {
  /**
   * Inicia todos los schedulers
   */
  startSchedulers: () => {
    logger.info('Initializing system schedulers...');
    
    try {
      statsScheduler.start();
      cleanupScheduler.start();
      healthCheckScheduler.start();
      
      logger.info('All schedulers started successfully');
    } catch (error) {
      logger.error('Error starting schedulers:', error);
    }
  },

  /**
   * Detiene todos los schedulers
   * Útil para graceful shutdown
   */
  stopSchedulers: () => {
    logger.info('Stopping system schedulers...');
    
    try {
      statsScheduler.stop();
      cleanupScheduler.stop();
      healthCheckScheduler.stop();
      
      logger.info('All schedulers stopped');
    } catch (error) {
      logger.error('Error stopping schedulers:', error);
    }
  },
};

module.exports = schedulers;
