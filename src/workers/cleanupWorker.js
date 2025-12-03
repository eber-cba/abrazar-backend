const { Worker, QueueEvents } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');
const prisma = require('../prismaClient');
const cacheService = require('../services/cache.service');

/**
 * Cleanup Worker - Procesa jobs de limpieza de datos obsoletos
 * 
 * Este worker consume jobs de la cola 'cleanup' y elimina:
 * - Sesiones expiradas
 * - Tokens revocados antiguos
 * - Cache obsoleto en Redis
 */

/**
 * Procesa un job de limpieza
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.type - Tipo de limpieza ('sessions', 'tokens', 'cache')
 */
async function processCleanupJob(job) {
  const { type } = job.data;
  
  logger.info(`Processing cleanup job: ${type}`);
  
  try {
    let result;
    
    switch (type) {
      case 'sessions':
        result = await cleanupExpiredSessions();
        break;
      
      case 'tokens':
        result = await cleanupRevokedTokens();
        break;
      
      case 'cache':
        result = await cleanupObsoleteCache();
        break;
      
      case 'all':
        // Ejecutar todas las limpiezas
        const [sessions, tokens, cache] = await Promise.all([
          cleanupExpiredSessions(),
          cleanupRevokedTokens(),
          cleanupObsoleteCache(),
        ]);
        result = { sessions, tokens, cache };
        break;
      
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
    
    logger.info(`Cleanup job completed: ${type}`, result);
    
    return {
      success: true,
      type,
      result,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error processing cleanup job ${type}:`, error);
    throw error;
  }
}

/**
 * Limpia sesiones expiradas de la base de datos y Redis
 */
async function cleanupExpiredSessions() {
  const now = new Date();
  
  logger.info('Cleaning up expired sessions...');
  
  try {
    // 1. Eliminar sesiones expiradas de PostgreSQL
    const deletedSessions = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isValid: false },
        ],
      },
    });
    
    // 2. Limpiar sesiones de Redis (patrón: session:*) usando SCAN
    let deletedRedisKeys = 0;
    let cursor = '0';
    
    do {
      // SCAN es no bloqueante, a diferencia de KEYS
      const result = await redisClient.scan(cursor, 'MATCH', 'session:*', 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        // Si TTL es -1 (sin expiración) o -2 (no existe), o si ya expiró
        if (ttl === -1 || ttl === -2 || ttl === 0) {
          await redisClient.del(key);
          deletedRedisKeys++;
        }
      }
    } while (cursor !== '0');
    
    
    logger.info(`Cleaned up ${deletedSessions.count} sessions from DB and ${deletedRedisKeys} from Redis`);
    
    return {
      deletedFromDB: deletedSessions.count,
      deletedFromRedis: deletedRedisKeys,
      total: deletedSessions.count + deletedRedisKeys,
    };
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
    throw error;
  }
}

/**
 * Limpia tokens revocados antiguos (más de 30 días)
 */
async function cleanupRevokedTokens() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  logger.info('Cleaning up old revoked tokens...');
  
  try {
    // 1. Eliminar tokens revocados antiguos de PostgreSQL
    const deletedTokens = await prisma.revokedToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Ya expirados naturalmente
          { revokedAt: { lt: thirtyDaysAgo } }, // Revocados hace más de 30 días
        ],
      },
    });
    
    // 2. Limpiar blacklist de tokens en Redis (patrón: token:blacklist:*) usando SCAN
    let deletedRedisKeys = 0;
    let cursor = '0';
    
    do {
      // SCAN es no bloqueante, a diferencia de KEYS
      const result = await redisClient.scan(cursor, 'MATCH', 'token:blacklist:*', 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        // Si ya expiró o no tiene TTL
        if (ttl === -2 || ttl === 0) {
          await redisClient.del(key);
          deletedRedisKeys++;
        }
      }
    } while (cursor !== '0');
    
    
    logger.info(`Cleaned up ${deletedTokens.count} tokens from DB and ${deletedRedisKeys} from Redis`);
    
    return {
      deletedFromDB: deletedTokens.count,
      deletedFromRedis: deletedRedisKeys,
      total: deletedTokens.count + deletedRedisKeys,
    };
  } catch (error) {
    logger.error('Error cleaning up tokens:', error);
    throw error;
  }
}

/**
 * Limpia cache obsoleto de Redis
 */
async function cleanupObsoleteCache() {
  logger.info('Cleaning up obsolete cache...');
  
  try {
    let deletedKeys = 0;
    
    // Patrones de cache a limpiar
    const cachePatterns = [
      'stats:*',      // Estadísticas (se regeneran automáticamente)
      'cache:*',      // Cache genérico
      'temp:*',       // Datos temporales
    ];
    
    for (const pattern of cachePatterns) {
      let cursor = '0';
      
      do {
        // SCAN es no bloqueante, a diferencia de KEYS
        const result = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        
        for (const key of keys) {
          const ttl = await redisClient.ttl(key);
          
          // Si no tiene TTL (-1) o ya expiró (-2, 0)
          if (ttl === -1 || ttl === -2 || ttl === 0) {
            await redisClient.del(key);
            deletedKeys++;
          }
        }
      } while (cursor !== '0');
    }
    
    
    logger.info(`Cleaned up ${deletedKeys} obsolete cache keys from Redis`);
    
    return {
      deletedKeys,
      patterns: cachePatterns,
    };
  } catch (error) {
    logger.error('Error cleaning up cache:', error);
    throw error;
  }
}

/**
 * Limpia logs antiguos (más de 90 días)
 * Esta función se puede llamar periódicamente para mantener la DB limpia
 */
async function cleanupOldLogs() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  logger.info('Cleaning up old audit logs...');
  
  try {
    // Mantener solo logs de los últimos 90 días
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        // No eliminar logs críticos (opcional)
        action: {
          notIn: [
            'delete_user',
            'delete_organization',
            'security_breach',
          ],
        },
      },
    });
    
    logger.info(`Cleaned up ${deletedLogs.count} old audit logs`);
    
    return {
      deletedLogs: deletedLogs.count,
    };
  } catch (error) {
    logger.error('Error cleaning up logs:', error);
    throw error;
  }
}

/**
 * Limpia historiales de casos antiguos (más de 1 año)
 */
async function cleanupOldCaseHistory() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  logger.info('Cleaning up old case history...');
  
  try {
    // Solo eliminar historial de casos ya resueltos hace más de 1 año
    const deletedHistory = await prisma.caseHistory.deleteMany({
      where: {
        createdAt: { lt: oneYearAgo },
        case: {
          status: 'RESOLVED',
          updatedAt: { lt: oneYearAgo },
        },
      },
    });
    
    logger.info(`Cleaned up ${deletedHistory.count} old case history records`);
    
    return {
      deletedHistory: deletedHistory.count,
    };
  } catch (error) {
    logger.error('Error cleaning up case history:', error);
    throw error;
  }
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

const cleanupWorker = new Worker('cleanup', processCleanupJob, {
  connection: redisClient,
  concurrency: 3, // Procesar hasta 3 jobs de limpieza simultáneamente
  limiter: {
    max: 3,
    duration: 60000, // Máximo 3 jobs por minuto
  },
});

// Event listeners
cleanupWorker.on('completed', (job) => {
  logger.info(`Cleanup worker completed job ${job.id}`);
});

cleanupWorker.on('failed', (job, error) => {
  logger.error(`Cleanup worker failed job ${job?.id}:`, error);
});

cleanupWorker.on('error', (error) => {
  logger.error('Cleanup worker error:', error);
});

logger.info('Cleanup worker initialized and ready');

// QueueEvents para escuchar eventos de la cola
const queueEvents = new QueueEvents('cleanup', { connection: redisClient });

module.exports = {
  cleanupWorker,
  queueEvents,
  close: async () => {
    await cleanupWorker.close();
    await queueEvents.close();
  },
};

