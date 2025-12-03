/**
 * Cases Service
 * Handles all case-related business logic with multi-tenant support
 */

const prisma = require('../../prismaClient');
const caseHistoryService = require('./case-history.service');
const zoneService = require('../zones/zone.service');
const { logAudit } = require('../audit/audit.service');
const statisticsService = require('../statistics/statistics.service');

class CasesService {
  /**
   * Create a new case.
   * Auto-assigns to zone and invalidates stats cache.
   * 
   * @param {Object} data - Case data
   * @param {string} userId - User ID creating the case
   * @param {string} [organizationId] - Organization ID
   * @returns {Promise<Object>} Created case
   */
  async createCase(data, userId, organizationId = null) {
    const caseData = {
      fullName: data.fullName,
      age: data.age,
      description: data.description,
      photoUrl: data.photoUrl,
      lat: data.lat,
      lng: data.lng,
      reportedByConsent: data.reportedByConsent || false,
      createdBy: userId,
      organizationId,
    };

    const newCase = await prisma.case.create({
      data: caseData,
      include: {
        creator: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Record in case history
    await caseHistoryService.recordCaseCreation(newCase.id, userId);

    // Auto-assign to zone if organization exists
    if (organizationId) {
      await zoneService.assignCaseToZone(newCase.id);
      // Invalidate stats cache
      await statisticsService.invalidateStatsCache(organizationId);
    }

    // Log audit
    await logAudit(userId, 'create_case', 'case', newCase.id);

    return newCase;
  }

  /**
   * Get all cases with multi-tenant filtering.
   * 
   * @param {Object} filters - Query filters (status, emergency, zone, team)
   * @param {string} [organizationId] - Organization ID
   * @param {boolean} [isGlobalAdmin] - Whether user is global admin
   * @returns {Promise<Array>} List of cases
   */
  async getAllCases(filters, organizationId = null, isGlobalAdmin = false) {
    const where = {};

    // Multi-tenant filtering
    if (!isGlobalAdmin) {
      if (organizationId) {
        where.organizationId = organizationId;
      } else {
        // Public users see only public cases or their own
        where.OR = [
          { organizationId: null },
        ];
      }
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Emergency filter
    if (filters.isEmergency !== undefined) {
      where.isEmergency = filters.isEmergency === 'true';
    }

    // Zone filter
    if (filters.zoneId) {
      where.zoneId = filters.zoneId;
    }

    // Team filter
    if (filters.teamId) {
      where.assignedToTeamId = filters.teamId;
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        creator: {
          select: { id: true, email: true, name: true },
        },
        assignedToUser: {
          select: { id: true, email: true, name: true },
        },
        assignedToTeam: {
          select: { id: true, name: true },
        },
        zone: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { isEmergency: 'desc' },
        { emergencyLevel: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return cases;
  }

  /**
   * Get case by ID.
   * Includes detailed relations (creator, updater, assignee, history, comments).
   * 
   * @param {string} id - Case ID
   * @returns {Promise<Object>} Case data
   */
  async getCaseById(id) {
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, email: true, name: true },
        },
        updater: {
          select: { id: true, email: true, name: true },
        },
        assignedToUser: {
          select: { id: true, email: true, name: true, role: true },
        },
        assignedToTeam: {
          select: { id: true, name: true },
        },
        zone: {
          select: { id: true, name: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
        statusHistory: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: {
              select: { id: true, email: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return caseData;
  }

  /**
   * Update case.
   * Handles status changes and history recording.
   * 
   * @param {string} id - Case ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID updating
   * @returns {Promise<Object>} Updated case
   */
  async updateCase(id, data, userId) {
    const currentCase = await prisma.case.findUnique({
      where: { id },
      select: { status: true, organizationId: true },
    });

    const updateData = {
      fullName: data.fullName,
      age: data.age,
      description: data.description,
      photoUrl: data.photoUrl,
      updatedBy: userId,
    };

    // Handle status change
    if (data.status && data.status !== currentCase.status) {
      updateData.status = data.status;
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, email: true, name: true },
        },
        updater: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Record status change in history
    if (data.status && data.status !== currentCase.status) {
      await caseHistoryService.recordStatusChange(
        id,
        userId,
        currentCase.status,
        data.status
      );
    } else {
      // Record general edit
      await caseHistoryService.recordEdit(id, userId, data);
    }

    // Log audit
    await logAudit(userId, 'update_case', 'case', id, data);

    // Invalidate stats cache if organization exists
    if (currentCase.organizationId) {
      await statisticsService.invalidateStatsCache(currentCase.organizationId);
    }

    return updatedCase;
  }

  /**
   * Assign case to user or team.
   * 
   * @param {string} id - Case ID
   * @param {string} userId - User ID performing assignment
   * @param {Object} assignTo - Assignment target
   * @param {string} [assignTo.userId] - Target User ID
   * @param {string} [assignTo.teamId] - Target Team ID
   * @returns {Promise<Object>} Updated case
   */
  async assignCase(id, userId, assignTo) {
    const updateData = {};

    if (assignTo.userId) {
      updateData.assignedToUserId = assignTo.userId;
    }

    if (assignTo.teamId) {
      updateData.assignedToTeamId = assignTo.teamId;
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, email: true, name: true },
        },
        assignedToUser: {
          select: { id: true, email: true, name: true },
        },
        assignedToTeam: {
          select: { id: true, name: true },
        },
      },
    });

    // Record assignment in history
    await caseHistoryService.recordAssignment(id, userId, assignTo);

    // Log audit
    await logAudit(userId, 'assign_case', 'case', id, assignTo);

    // Invalidate stats cache
    if (updatedCase.organizationId) {
      await statisticsService.invalidateStatsCache(updatedCase.organizationId);
    }

    return updatedCase;
  }

  /**
   * Delete case.
   * 
   * @param {string} id - Case ID
   * @returns {Promise<void>}
   */
  async deleteCase(id) {
    const deletedCase = await prisma.case.delete({
      where: { id },
      select: { organizationId: true },
    });

    // Invalidate stats cache
    if (deletedCase.organizationId) {
      await statisticsService.invalidateStatsCache(deletedCase.organizationId);
    }
  }
}

module.exports = new CasesService();
