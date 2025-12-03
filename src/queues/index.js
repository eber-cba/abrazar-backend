const { Queue } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Queue Registry - Registro central de todas las colas BullMQ
 * 
 * Este archivo centraliza la configuración y creación de todas las colas
 * del sistema para procesamiento asíncrono de tareas pesadas.
 */

// Configuración común para todas las colas
const defaultQueueConfig = {
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
};

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

/**
 * statsQueue - Cola para recalcular estadísticas pesadas
 * 
 * Jobs:
 * - recalculate-stats: Recalcula estadísticas de una organización
 * 
 * Procesamiento: Cada 30 minutos (programado por cron)
 */
const statsQueue = new Queue('stats', defaultQueueConfig);

/**
 * emailQueue - Cola para envío de emails y notificaciones
 * 
 * Jobs:
 * - send-email: Envía un email individual
 * - send-bulk-email: Envía emails masivos
 * - send-notification: Envía notificación push
 * 
 * Procesamiento: Inmediato con rate limiting
 */
const emailQueue = new Queue('email', defaultQueueConfig);

/**
 * cleanupQueue - Cola para limpieza de datos obsoletos
 * 
 * Jobs:
 * - cleanup-sessions: Elimina sesiones expiradas
 * - cleanup-tokens: Elimina tokens revocados antiguos
 * - cleanup-cache: Limpia cache Redis obsoleto
 * 
 * Procesamiento: Diario a las 4 AM (programado por cron)
 */
const cleanupQueue = new Queue('cleanup', defaultQueueConfig);

/**
 * uploadsQueue - Cola para procesamiento de imágenes/documentos
 * 
 * Jobs:
 * - process-image: Redimensiona, comprime y sube imagen a Cloudinary
 * - process-document: Valida y procesa documentos
 * 
 * Procesamiento: Inmediato al subir archivo
 */
const uploadsQueue = new Queue('uploads', defaultQueueConfig);

// ============================================================================
// QUEUE EVENTS & MONITORING
// ============================================================================

// Logging de eventos importantes para todas las colas
const queues = [statsQueue, emailQueue, cleanupQueue, uploadsQueue];

queues.forEach((queue) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queue.name} error:`, error);
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
    logger.error(`Job ${job?.id} failed in queue ${queue.name}:`, error);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Agrega un job a la cola de estadísticas
 * @param {Object} data - Datos del job
 * @param {string} data.organizationId - ID de la organización
 * @param {string} data.type - Tipo de estadística a recalcular
 */
async function addStatsJob(data) {
  return await statsQueue.add('recalculate-stats', data, {
    priority: 2, // Prioridad media
  });
}

/**
 * Agrega un job a la cola de emails
 * @param {Object} data - Datos del job
 * @param {string} data.to - Email destinatario
 * @param {string} data.subject - Asunto
 * @param {string} data.body - Cuerpo del email
 * @param {string} data.template - Template a usar (opcional)
 */
async function addEmailJob(data) {
  return await emailQueue.add('send-email', data, {
    priority: 1, // Alta prioridad
  });
}

/**
 * Agrega un job a la cola de limpieza
 * @param {string} type - Tipo de limpieza ('sessions', 'tokens', 'cache')
 */
async function addCleanupJob(type) {
  return await cleanupQueue.add(`cleanup-${type}`, { type }, {
    priority: 3, // Baja prioridad
  });
}

/**
 * Agrega un job a la cola de uploads
 * @param {Object} data - Datos del job
 * @param {Buffer} data.fileBuffer - Buffer del archivo
 * @param {string} data.userId - ID del usuario
 * @param {string} data.type - Tipo de archivo ('image', 'document')
 */
async function addUploadJob(data) {
  return await uploadsQueue.add('process-image', data, {
    priority: 1, // Alta prioridad
  });
}

/**
 * Obtiene estadísticas de todas las colas
 */
async function getQueuesStats() {
  const stats = {};
  
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

  return stats;
}

/**
 * Limpia todas las colas (solo para testing)
 */
async function cleanAllQueues() {
  for (const queue of queues) {
    await queue.drain();
    await queue.clean(0, 1000, 'completed');
    await queue.clean(0, 1000, 'failed');
  }
  logger.info('All queues cleaned');
}

/**
 * Cierra todas las colas gracefully
 */
async function closeAllQueues() {
  for (const queue of queues) {
    await queue.close();
  }
  logger.info('All queues closed');
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
};
