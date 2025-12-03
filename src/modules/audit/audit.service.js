/**
 * Audit Service
 * System-wide audit logging for all critical actions
 */

const prisma = require('../../prismaClient');

/**
 * Log an audit entry
 * @param {string} userId - User ID performing action
 * @param {string} action - Action performed
 * @param {string} targetType - Type of target (case, user, team, zone, organization)
 * @param {string} targetId - ID of target
 * @param {Object} metadata - Additional metadata
 * @param {string} ipAddress - IP address of user
 * @returns {Promise<Object>} Created audit log
 */
async function logAudit(
  userId,
  action,
  targetType = null,
  targetId = null,
  metadata = null,
  ipAddress = null
) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        metadata,
        ipAddress,
      },
    });

    return auditLog;
  } catch (error) {
    console.error('[AUDIT ERROR]', error);
    // Don't throw - audit failures shouldn't break the application
    return null;
  }
}

/**
 * Log organization action
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {string} orgId - Organization ID
 * @param {Object} metadata - Additional metadata
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Created audit log
 */
async function logOrganizationAction(
  userId,
  action,
  orgId,
  metadata = null,
  ipAddress = null
) {
  return logAudit(userId, action, 'organization', orgId, metadata, ipAddress);
}

/**
 * Log team action
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {string} teamId - Team ID
 * @param {Object} metadata - Additional metadata
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Created audit log
 */
async function logTeamAction(
  userId,
  action,
  teamId,
  metadata = null,
  ipAddress = null
) {
  return logAudit(userId, action, 'team', teamId, metadata, ipAddress);
}

/**
 * Log zone action
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {string} zoneId - Zone ID
 * @param {Object} metadata - Additional metadata
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Created audit log
 */
async function logZoneAction(
  userId,
  action,
  zoneId,
  metadata = null,
  ipAddress = null
) {
  return logAudit(userId, action, 'zone', zoneId, metadata, ipAddress);
}

/**
 * Log emergency action
 * @param {string} userId - User ID
 * @param {string} caseId - Case ID
 * @param {number} level - Emergency level
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Created audit log
 */
async function logEmergency(userId, caseId, level, ipAddress = null) {
  return logAudit(
    userId,
    'emergency_marked',
    'case',
    caseId,
    { level },
    ipAddress
  );
}

/**
 * Get audit logs by organization
 * @param {string} orgId - Organization ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Audit logs
 */
async function getAuditLogsByOrganization(orgId, filters = {}) {
  const where = {
    user: {
      organizationId: orgId,
    },
  };

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100,
  });

  return logs;
}

/**
 * Get audit logs by user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Audit logs
 */
async function getAuditLogsByUser(userId, filters = {}) {
  const where = { userId };

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100,
  });

  return logs;
}

/**
 * Get audit logs by case
 * @param {string} caseId - Case ID
 * @returns {Promise<Array>} Audit logs
 */
async function getAuditLogsByCase(caseId) {
  const logs = await prisma.auditLog.findMany({
    where: {
      targetType: 'case',
      targetId: caseId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return logs;
}

/**
 * Get audit statistics
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Audit statistics
 */
async function getAuditStatistics(orgId) {
  const [totalLogs, actionBreakdown, recentActivity] = await Promise.all([
    prisma.auditLog.count({
      where: {
        user: {
          organizationId: orgId,
        },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        user: {
          organizationId: orgId,
        },
      },
      _count: true,
    }),
    prisma.auditLog.findMany({
      where: {
        user: {
          organizationId: orgId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    totalLogs,
    actionBreakdown: actionBreakdown.map((item) => ({
      action: item.action,
      count: item._count,
    })),
    recentActivity,
  };
}

module.exports = {
  logAudit,
  logOrganizationAction,
  logTeamAction,
  logZoneAction,
  logEmergency,
  getAuditLogsByOrganization,
  getAuditLogsByUser,
  getAuditLogsByCase,
  getAuditStatistics,
};
