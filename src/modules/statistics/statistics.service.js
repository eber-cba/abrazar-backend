/**
 * Statistics Service
 * Provides comprehensive analytics for organizations
 */

const prisma = require('../../prismaClient');
const cacheService = require('../../services/cache.service');
const { addStatsJob } = require('../../queues');
const logger = require('../../config/logger');

const CACHE_TTL = 1800; // 30 minutes (matches cron job frequency)

class StatisticsService {
  /**
   * Invalidate all statistics cache for an organization
   * @param {string} orgId - Organization ID
   */
  async invalidateStatsCache(orgId) {
    try {
      const keys = [
        cacheService.generateKey('stats', orgId, 'overview'),
        cacheService.generateKey('stats', orgId, 'status'),
        cacheService.generateKey('stats', orgId, 'zones'),
        cacheService.generateKey('stats', orgId, 'teams'),
        cacheService.generateKey('stats', orgId, 'emergencies'),
        cacheService.generateKey('stats', orgId, 'response-time'),
        cacheService.generateKey('stats', orgId, 'user-activity'),
        cacheService.generateKey('stats', orgId, 'user-count'),
      ];

      await Promise.all(keys.map(key => cacheService.del(key)));
      logger.info(`Invalidated stats cache for organization ${orgId}`);
      
      // Trigger background recalculation
      await addStatsJob({
        organizationId: orgId,
        type: 'overview',
      });
    } catch (error) {
      logger.error(`Error invalidating stats cache for ${orgId}:`, error);
    }
  }

  /**
   * Get overview statistics for organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Overview statistics
   */
  async getOverviewStats(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'overview');
    const cached = await cacheService.get(cacheKey);
    
    if (cached) return cached;

    // If not in cache, calculate directly (fallback) but also trigger background update for next time
    // We calculate directly here to ensure the user gets data immediately on first load
    const [
      totalCases,
      activeCases,
      resolvedCases,
      emergencyCases,
      totalUsers,
      totalTeams,
      totalZones,
      casesByStatus,
    ] = await Promise.all([
      prisma.case.count({ where: { organizationId: orgId } }),
      prisma.case.count({
        where: {
          organizationId: orgId,
          status: { in: ['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP'] },
        },
      }),
      prisma.case.count({
        where: { organizationId: orgId, status: 'RESOLVED' },
      }),
      prisma.case.count({
        where: { organizationId: orgId, isEmergency: true },
      }),
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.team.count({ where: { organizationId: orgId } }),
      prisma.zone.count({ where: { organizationId: orgId } }),
      prisma.case.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
    ]);

    const result = {
      totalCases,
      activeCases,
      resolvedCases,
      emergencyCases,
      totalUsers,
      totalTeams,
      totalZones,
      casesByStatus: casesByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get cases by status with date range
   * @param {string} orgId - Organization ID
   * @param {Object} dateRange - {startDate, endDate}
   * @returns {Promise<Object>} Cases by status
   */
  async getCasesByStatus(orgId, dateRange = {}) {
    // Only cache if no date range is provided (standard view)
    const canCache = !dateRange.startDate && !dateRange.endDate;
    const cacheKey = canCache ? cacheService.generateKey('stats', orgId, 'status') : null;

    if (canCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const where = { organizationId: orgId };

    if (dateRange.startDate || dateRange.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) where.createdAt.lte = new Date(dateRange.endDate);
    }

    const casesByStatus = await prisma.case.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const total = casesByStatus.reduce((sum, item) => sum + item._count, 0);

    const result = {
      total,
      breakdown: casesByStatus.map((item) => ({
        status: item.status,
        count: item._count,
        percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) : 0,
      })),
    };

    if (canCache) {
      await cacheService.set(cacheKey, result, CACHE_TTL);
    }

    return result;
  }

  /**
   * Get cases by zone
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Cases by zone
   */
  async getCasesByZone(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'zones');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const zones = await prisma.zone.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    const casesByZone = await Promise.all(
      zones.map(async (zone) => {
        const [active, resolved, emergency] = await Promise.all([
          prisma.case.count({
            where: {
              zoneId: zone.id,
              status: { in: ['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP'] },
            },
          }),
          prisma.case.count({
            where: { zoneId: zone.id, status: 'RESOLVED' },
          }),
          prisma.case.count({
            where: { zoneId: zone.id, isEmergency: true },
          }),
        ]);

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          totalCases: zone._count.cases,
          activeCases: active,
          resolvedCases: resolved,
          emergencyCases: emergency,
        };
      })
    );

    // Also get unassigned cases
    const unassignedCases = await prisma.case.count({
      where: {
        organizationId: orgId,
        zoneId: null,
      },
    });

    const result = {
      zones: casesByZone,
      unassignedCases,
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get cases by team
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Cases by team
   */
  async getCasesByTeam(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'teams');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const teams = await prisma.team.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedCases: true,
            members: true,
          },
        },
      },
    });

    const casesByTeam = await Promise.all(
      teams.map(async (team) => {
        const [active, resolved, emergency] = await Promise.all([
          prisma.case.count({
            where: {
              assignedToTeamId: team.id,
              status: { in: ['REPORTED', 'VERIFIED', 'ASSISTING', 'FOLLOW_UP'] },
            },
          }),
          prisma.case.count({
            where: { assignedToTeamId: team.id, status: 'RESOLVED' },
          }),
          prisma.case.count({
            where: { assignedToTeamId: team.id, isEmergency: true },
          }),
        ]);

        return {
          teamId: team.id,
          teamName: team.name,
          totalMembers: team._count.members,
          totalCases: team._count.assignedCases,
          activeCases: active,
          resolvedCases: resolved,
          emergencyCases: emergency,
        };
      })
    );

    // Also get unassigned cases
    const unassignedCases = await prisma.case.count({
      where: {
        organizationId: orgId,
        assignedToTeamId: null,
      },
    });

    const result = {
      teams: casesByTeam,
      unassignedCases,
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get emergency statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Emergency statistics
   */
  async getEmergencyStats(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'emergencies');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [
      totalEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      emergenciesByLevel,
    ] = await Promise.all([
      prisma.case.count({
        where: { organizationId: orgId, isEmergency: true },
      }),
      prisma.emergency.count({
        where: {
          case: { organizationId: orgId },
          resolved: false,
        },
      }),
      prisma.emergency.count({
        where: {
          case: { organizationId: orgId },
          resolved: true,
        },
      }),
      prisma.emergency.groupBy({
        by: ['level'],
        where: {
          case: { organizationId: orgId },
          resolved: false,
        },
        _count: true,
      }),
    ]);

    const result = {
      totalEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      emergenciesByLevel: emergenciesByLevel.map((item) => ({
        level: item.level,
        count: item._count,
      })),
    };

    await cacheService.set(cacheKey, result, 60); // 1 minute TTL for emergencies
    return result;
  }

  /**
   * Get response time statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Response time statistics
   */
  async getResponseTimeStats(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'response-time');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // Get cases with status changes
    const cases = await prisma.case.findMany({
      where: {
        organizationId: orgId,
        status: { not: 'REPORTED' },
      },
      select: {
        id: true,
        createdAt: true,
        statusHistory: {
          where: {
            newStatus: { not: 'REPORTED' },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const responseTimes = cases
      .filter((c) => c.statusHistory.length > 0)
      .map((c) => {
        const responseTime =
          c.statusHistory[0].createdAt.getTime() - c.createdAt.getTime();
        return responseTime / (1000 * 60 * 60); // Convert to hours
      });

    if (responseTimes.length === 0) {
      return {
        averageResponseTime: 0,
        medianResponseTime: 0,
        totalCasesWithResponse: 0,
      };
    }

    const average =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sorted = responseTimes.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const result = {
      averageResponseTime: average.toFixed(2),
      medianResponseTime: median.toFixed(2),
      totalCasesWithResponse: responseTimes.length,
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get user activity statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} User activity statistics
   */
  async getUserActivityStats(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'user-activity');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        _count: {
          select: {
            createdCases: true,
            assignedCases: true,
            caseHistory: true,
            comments: true,
          },
        },
      },
    });

    const userStats = users.map((user) => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      casesCreated: user._count.createdCases,
      casesAssigned: user._count.assignedCases,
      actionsPerformed: user._count.caseHistory,
      commentsAdded: user._count.comments,
    }));

    const result = {
      totalUsers: users.length,
      userStats: userStats.sort(
        (a, b) => b.actionsPerformed - a.actionsPerformed
      ),
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get user count statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} User count by role
   */
  async getUserCountStats(orgId) {
    const cacheKey = cacheService.generateKey('stats', orgId, 'user-count');
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      where: { organizationId: orgId },
      _count: true,
    });

    const totalUsers = await prisma.user.count({
      where: { organizationId: orgId },
    });

    const result = {
      totalUsers,
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count,
      })),
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Export statistics to CSV format
   * @param {string} orgId - Organization ID
   * @param {string} format - Export format (csv or json)
   * @returns {Promise<string|Object>} Exported data
   */
  async exportStatistics(orgId, format = 'json') {
    // Export is on-demand, no caching of the final file, but it uses cached sub-methods
    const overview = await this.getOverviewStats(orgId);
    const casesByStatus = await this.getCasesByStatus(orgId);
    const casesByZone = await this.getCasesByZone(orgId);
    const casesByTeam = await this.getCasesByTeam(orgId);
    const emergencyStats = await this.getEmergencyStats(orgId);
    const userActivity = await this.getUserActivityStats(orgId);

    const data = {
      overview,
      casesByStatus,
      casesByZone,
      casesByTeam,
      emergencyStats,
      userActivity,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Simple CSV conversion for overview
      let csv = 'Metric,Value\n';
      csv += `Total Cases,${overview.totalCases}\n`;
      csv += `Active Cases,${overview.activeCases}\n`;
      csv += `Resolved Cases,${overview.resolvedCases}\n`;
      csv += `Emergency Cases,${overview.emergencyCases}\n`;
      csv += `Total Users,${overview.totalUsers}\n`;
      csv += `Total Teams,${overview.totalTeams}\n`;
      csv += `Total Zones,${overview.totalZones}\n`;
      return csv;
    }

    return data;
  }
}

module.exports = new StatisticsService();

