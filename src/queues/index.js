const { Queue } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Queue Registry - Registro central de todas las colas BullMQ
 * 
 * Este archivo centraliza la configuración y creación de todas las colas
 * del sistema para procesamiento asíncrono de tareas pesadas.
 */

// Check if Redis is available
const isRedisAvailable = redisClient.status === 'ready' || redisClient.status === 'connecting';

// Configuración común para todas las colas
const defaultQueueConfig = isRedisAvailable ? {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Reintentar 3 veces si falla
    backoff: {
      type: 'exponential',
      delay: 2000, // Esperar 2s, 4s, 8s entre reintentos
    },
    removeOnComplete: {
      age: 24 * 3600, // Mantener jobs completados por 24 horas
      count: 1000, // Mantener máximo 1000 jobs completados
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Mantener jobs fallidos por 7 días
    },
  },
} : null;

// ============================================================================
// MOCK QUEUE (when Redis is unavailable)
// ============================================================================

class MockQueue {
  constructor(name) {
    this.name = name;
  }
  
  async add() {
    logger.warn(`Queue ${this.name} is disabled (Redis unavailable). Job skipped.`);
    return { id: 'mock', data: {} };
  }
  
  on() { return this; }
  async getWaitingCount() { return 0; }
  async getActiveCount() { return 0; }
  async getCompletedCount() { return 0; }
  async getFailedCount() { return 0; }
  async getDelayedCount() { return 0; }
  async drain() { return; }
  async clean() { return; }
  async close() { return; }
}

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

/**
 * statsQueue - Cola para recalcular estadísticas pesadas
 */
const statsQueue = isRedisAvailable 
  ? new Queue('stats', defaultQueueConfig)
  : new MockQueue('stats');

/**
 * emailQueue - Cola para envío de emails y notificaciones
 */
const emailQueue = isRedisAvailable
  ? new Queue('email', defaultQueueConfig)
  : new MockQueue('email');

/**
 * cleanupQueue - Cola para limpieza de datos obsoletos
 */
const cleanupQueue = isRedisAvailable
  ? new Queue('cleanup', defaultQueueConfig)
  : new MockQueue('cleanup');

/**
 * uploadsQueue - Cola para procesamiento de imágenes/documentos
 */
const uploadsQueue = isRedisAvailable
  ? new Queue('uploads', defaultQueueConfig)
  : new MockQueue('uploads');

// ============================================================================
// QUEUE EVENTS & MONITORING
// ============================================================================

const queues = [statsQueue, emailQueue, cleanupQueue, uploadsQueue];

// Only set up event listeners for real queues
if (isRedisAvailable) {
  queues.forEach((queue) => {
    queue.on('error', (error) => {
      logger.error(`Queue ${queue.name} error:`, error.message);
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting in queue ${queue.name}`);
    });

    queue.on('active', (job) => {
      logger.info(`Job ${job.id} started processing in queue ${queue.name}`);
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed in queue ${queue.name}`);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed in queue ${queue.name}:`, error.message);
    });
  });
} else {
  logger.warn('⚠️ Queues are disabled because Redis is unavailable.');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Agrega un job a la cola de estadísticas
 */
async function addStatsJob(data) {
  try {
    return await statsQueue.add('recalculate-stats', data, {
      priority: 2,
    });
  } catch (error) {
    logger.error('Failed to add stats job:', error.message);
    return null;
  }
}

/**
 * Agrega un job a la cola de emails
 */
async function addEmailJob(data) {
  try {
    return await emailQueue.add('send-email', data, {
      priority: 1,
    });
  } catch (error) {
    logger.error('Failed to add email job:', error.message);
    return null;
  }
}

/**
 * Agrega un job a la cola de limpieza
 */
async function addCleanupJob(type) {
  try {
    return await cleanupQueue.add(`cleanup-${type}`, { type }, {
      priority: 3,
    });
  } catch (error) {
    logger.error('Failed to add cleanup job:', error.message);
    return null;
  }
}

/**
 * Agrega un job a la cola de uploads
 */
async function addUploadJob(data) {
  try {
    return await uploadsQueue.add('process-image', data, {
      priority: 1,
    });
  } catch (error) {
    logger.error('Failed to add upload job:', error.message);
    return null;
  }
}

/**
 * Obtiene estadísticas de todas las colas
 */
async function getQueuesStats() {
  if (!isRedisAvailable) {
    return {
      stats: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
      email: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
      cleanup: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
      uploads: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
    };
  }

  const stats = {};
  
  try {
    for (const queue of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats[queue.name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    }
  } catch (error) {
    logger.error('Failed to get queue stats:', error.message);
  }

  return stats;
}

/**
 * Limpia todas las colas (solo para testing)
 */
async function cleanAllQueues() {
  if (!isRedisAvailable) {
    logger.warn('Cannot clean queues: Redis unavailable');
    return;
  }

  try {
    for (const queue of queues) {
      await queue.drain();
      await queue.clean(0, 1000, 'completed');
      await queue.clean(0, 1000, 'failed');
    }
    logger.info('All queues cleaned');
  } catch (error) {
    logger.error('Failed to clean queues:', error.message);
  }
}

/**
 * Cierra todas las colas gracefully
 */
async function closeAllQueues() {
  if (!isRedisAvailable) {
    return;
  }

  try {
    for (const queue of queues) {
      await queue.close();
    }
    logger.info('All queues closed');
  } catch (error) {
    logger.error('Failed to close queues:', error.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Queue instances
  statsQueue,
  emailQueue,
  cleanupQueue,
  uploadsQueue,
  
  // Helper functions
  addStatsJob,
  addEmailJob,
  addCleanupJob,
  addUploadJob,
  getQueuesStats,
  cleanAllQueues,
  closeAllQueues,
  
  // Status
  isRedisAvailable,
};
