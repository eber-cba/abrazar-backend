const { Worker, QueueEvents } = require('bullmq');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');
const cacheService = require('../services/cache.service');
const prisma = require('../prismaClient');

/**
 * Stats Worker - Procesa jobs de recálculo de estadísticas
 * 
 * Este worker consume jobs de la cola 'stats' y ejecuta cálculos pesados
 * de estadísticas en background, almacenando resultados en cache Redis.
 */

/**
 * Procesa un job de recálculo de estadísticas
 * @param {Object} job - Job de BullMQ
 * @param {Object} job.data - Datos del job
 * @param {string} job.data.organizationId - ID de la organización
 * @param {string} job.data.type - Tipo de estadística ('overview', 'zones', 'teams', etc.)
 */
async function processStatsJob(job) {
  const { organizationId, type = 'overview' } = job.data;
  
  console.log(`DEBUG: Processing stats job: org=${organizationId}, type=${type}, data=${JSON.stringify(job.data)}`);
  logger.info(`Processing stats job for organization ${organizationId}, type: ${type}`);
  
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    let stats;
    
    switch (type) {
      case 'overview':
        stats = await calculateOverviewStats(organizationId);
        break;
      
      case 'zones':
        stats = await calculateZoneStats(organizationId);
        break;
      
      case 'teams':
        stats = await calculateTeamStats(organizationId);
        break;
      
      case 'emergencies':
        stats = await calculateEmergencyStats(organizationId);
        break;
      
      case 'user-activity':
        stats = await calculateUserActivityStats(organizationId);
        break;
      
      default:
        stats = await calculateOverviewStats(organizationId);
    }
    
    // Guardar en cache Redis con TTL de 30 minutos
    const cacheKey = `stats:${organizationId}:${type}`;
    await cacheService.set(cacheKey, stats, 1800); // 30 min = 1800 segundos
    
    logger.info(`Stats job completed for organization ${organizationId}, type: ${type}`);
    
    return { success: true, stats, cacheKey };
  } catch (error) {
    logger.error(`Error processing stats job:`, error);
    throw error; // BullMQ reintentará automáticamente
  }
}

/**
 * Calcula estadísticas generales (overview)
 */
async function calculateOverviewStats(organizationId) {
  const [
    totalCases,
    casesByStatus,
    emergencyCases,
    resolvedCases,
    totalUsers,
    totalTeams,
    totalZones,
  ] = await Promise.all([
    // Total de casos
    prisma.case.count({
      where: { organizationId },
    }),
    
    // Casos por estado
    prisma.case.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    }),
    
    // Casos de emergencia activos
    prisma.case.count({
      where: {
        organizationId,
        isEmergency: true,
        status: { notIn: ['RESOLVED'] },
      },
    }),
    
    // Casos resueltos
    prisma.case.count({
      where: {
        organizationId,
        status: 'RESOLVED',
      },
    }),
    
    // Total de usuarios
    prisma.user.count({
      where: { organizationId },
    }),
    
    // Total de equipos
    prisma.team.count({
      where: { organizationId },
    }),
    
    // Total de zonas
    prisma.zone.count({
      where: { organizationId },
    }),
  ]);
  
  return {
    totalCases,
    casesByStatus: casesByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),
    emergencyCases,
    resolvedCases,
    totalUsers,
    totalTeams,
    totalZones,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calcula estadísticas por zona
 */
async function calculateZoneStats(organizationId) {
  const zoneStats = await prisma.zone.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: {
          cases: true,
          servicePoints: true,
        },
      },
      cases: {
        select: {
          status: true,
          isEmergency: true,
        },
      },
    },
  });
  
  return zoneStats.map((zone) => ({
    zoneId: zone.id,
    zoneName: zone.name,
    totalCases: zone._count.cases,
    totalServicePoints: zone._count.servicePoints,
    emergencyCases: zone.cases.filter((c) => c.isEmergency).length,
    resolvedCases: zone.cases.filter((c) => c.status === 'RESOLVED').length,
  }));
}

/**
 * Calcula estadísticas por equipo
 */
async function calculateTeamStats(organizationId) {
  const teamStats = await prisma.team.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: {
          members: true,
          assignedCases: true,
        },
      },
      assignedCases: {
        select: {
          status: true,
          isEmergency: true,
        },
      },
    },
  });
  
  return teamStats.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    totalMembers: team._count.members,
    totalCases: team._count.assignedCases,
    emergencyCases: team.assignedCases.filter((c) => c.isEmergency).length,
    resolvedCases: team.assignedCases.filter((c) => c.status === 'RESOLVED').length,
  }));
}

/**
 * Calcula estadísticas de emergencias
 */
async function calculateEmergencyStats(organizationId) {
  const emergencies = await prisma.emergency.findMany({
    where: {
      case: {
        organizationId,
      },
    },
    include: {
      case: {
        select: {
          status: true,
        },
      },
    },
  });
  
  const byLevel = emergencies.reduce((acc, emergency) => {
    const level = emergency.level;
    if (!acc[level]) {
      acc[level] = { total: 0, resolved: 0, active: 0 };
    }
    acc[level].total++;
    if (emergency.resolved) {
      acc[level].resolved++;
    } else {
      acc[level].active++;
    }
    return acc;
  }, {});
  
  return {
    totalEmergencies: emergencies.length,
    activeEmergencies: emergencies.filter((e) => !e.resolved).length,
    resolvedEmergencies: emergencies.filter((e) => e.resolved).length,
    byLevel,
  };
}

/**
 * Calcula estadísticas de actividad de usuarios
 */
async function calculateUserActivityStats(organizationId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [casesCreated, casesUpdated, commentsPosted] = await Promise.all([
    prisma.case.groupBy({
      by: ['createdBy'],
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    }),
    
    prisma.case.groupBy({
      by: ['updatedBy'],
      where: {
        organizationId,
        updatedAt: { gte: thirtyDaysAgo },
        updatedBy: { not: null },
      },
      _count: true,
    }),
    
    prisma.comment.groupBy({
      by: ['authorId'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        case: {
          organizationId,
        },
      },
      _count: true,
    }),
  ]);
  
  return {
    period: 'last_30_days',
    casesCreated: casesCreated.length,
    casesUpdated: casesUpdated.length,
    commentsPosted: commentsPosted.length,
  };
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

const statsWorker = new Worker('stats', processStatsJob, {
  connection: redisClient,
  concurrency: 2, // Procesar hasta 2 jobs simultáneamente (reducido para evitar saturar DB)
  limiter: {
    max: 10, // Máximo 10 jobs
    duration: 60000, // por minuto
  },
});

// Event listeners
statsWorker.on('completed', (job) => {
  logger.info(`Stats worker completed job ${job.id}`);
});

statsWorker.on('failed', (job, error) => {
  logger.error(`Stats worker failed job ${job?.id}:`, error);
});

statsWorker.on('error', (error) => {
  logger.error('Stats worker error:', error);
});

logger.info('Stats worker initialized and ready');

// QueueEvents para escuchar eventos de la cola
const queueEvents = new QueueEvents('stats', { connection: redisClient });

module.exports = {
  statsWorker,
  queueEvents,
  close: async () => {
    await statsWorker.close();
    await queueEvents.close();
  },
};

