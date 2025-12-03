/**
 * Emergency Service
 * Handles emergency case marking, escalation, and notifications
 */

const prisma = require('../../prismaClient');
const caseHistoryService = require('../cases/case-history.service');
const { logAudit } = require('../audit/audit.service');

class EmergencyService {
  /**
   * Mark case as emergency
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID marking emergency
   * @param {number} level - Emergency level (1-5)
   * @param {string} reason - Reason for emergency
   * @returns {Promise<Object>} Emergency record and updated case
   */
  async markAsEmergency(caseId, userId, level, reason = null) {
    if (level < 1 || level > 5) {
      throw new Error('Emergency level must be between 1 and 5');
    }

    // Update case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        isEmergency: true,
        emergencyLevel: level,
      },
    });

    // Create emergency record
    const emergency = await prisma.emergency.create({
      data: {
        caseId,
        level,
        reason,
        markedBy: userId,
      },
    });

    // Record in case history
    await caseHistoryService.recordEmergencyMarked(caseId, userId, level, reason);

    // Log audit
    await logAudit(userId, 'mark_emergency', 'case', caseId, {
      level,
      reason,
    });

    // Notify emergency contacts
    await this.notifyEmergencyContacts(caseId, updatedCase.organizationId);

    return { emergency, case: updatedCase };
  }

  /**
   * Escalate emergency level
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID escalating
   * @param {number} newLevel - New emergency level
   * @returns {Promise<Object>} Updated emergency and case
   */
  async escalateEmergency(caseId, userId, newLevel) {
    if (newLevel < 1 || newLevel > 5) {
      throw new Error('Emergency level must be between 1 and 5');
    }

    const currentCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: { emergencyLevel: true, isEmergency: true },
    });

    if (!currentCase?.isEmergency) {
      throw new Error('Case is not marked as emergency');
    }

    const oldLevel = currentCase.emergencyLevel;

    if (newLevel <= oldLevel) {
      throw new Error('New level must be higher than current level');
    }

    // Update case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: { emergencyLevel: newLevel },
    });

    // Update emergency record
    const emergency = await prisma.emergency.findFirst({
      where: { caseId, resolved: false },
      orderBy: { createdAt: 'desc' },
    });

    if (emergency) {
      await prisma.emergency.update({
        where: { id: emergency.id },
        data: { level: newLevel },
      });
    }

    // Record in case history
    await caseHistoryService.recordEmergencyEscalation(
      caseId,
      userId,
      oldLevel,
      newLevel
    );

    // Log audit
    await logAudit(userId, 'escalate_emergency', 'case', caseId, {
      oldLevel,
      newLevel,
    });

    // Notify emergency contacts
    await this.notifyEmergencyContacts(caseId, updatedCase.organizationId);

    return { emergency, case: updatedCase };
  }

  /**
   * Resolve emergency
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID resolving
   * @returns {Promise<Object>} Resolved emergency and updated case
   */
  async resolveEmergency(caseId, userId) {
    // Update case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        isEmergency: false,
        emergencyLevel: null,
      },
    });

    // Mark emergency as resolved
    const emergency = await prisma.emergency.findFirst({
      where: { caseId, resolved: false },
      orderBy: { createdAt: 'desc' },
    });

    if (emergency) {
      await prisma.emergency.update({
        where: { id: emergency.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    // Record in case history
    await caseHistoryService.recordEmergencyResolved(caseId, userId);

    // Log audit
    await logAudit(userId, 'resolve_emergency', 'case', caseId);

    return { emergency, case: updatedCase };
  }

  /**
   * Notify emergency contacts (organization admins and coordinators)
   * @param {string} caseId - Case ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<void>}
   */
  async notifyEmergencyContacts(caseId, orgId) {
    if (!orgId) return; // Public cases don't have organization contacts

    // Get organization admins and coordinators
    const contacts = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['ORGANIZATION_ADMIN', 'COORDINATOR'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // TODO: Implement actual notification system (email, SMS, push notifications)
    // For now, just log the notification
    console.log(`[EMERGENCY NOTIFICATION] Case ${caseId} - Notifying ${contacts.length} contacts`);
    
    // Log each notification in audit
    for (const contact of contacts) {
      await logAudit(contact.id, 'emergency_notification_sent', 'case', caseId, {
        notifiedUserId: contact.id,
      });
    }
  }

  /**
   * Get active emergencies for organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Active emergencies
   */
  async getActiveEmergencies(orgId) {
    const emergencies = await prisma.case.findMany({
      where: {
        organizationId: orgId,
        isEmergency: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedToTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        emergencies: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { emergencyLevel: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return emergencies;
  }

  /**
   * Get emergency statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Emergency statistics
   */
  async getEmergencyStatistics(orgId) {
    const [
      totalEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      emergenciesByLevel,
    ] = await Promise.all([
      prisma.emergency.count({
        where: {
          case: { organizationId: orgId },
        },
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

    return {
      totalEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      emergenciesByLevel: emergenciesByLevel.map((item) => ({
        level: item.level,
        count: item._count,
      })),
    };
  }

  /**
   * Get emergency history for case
   * @param {string} caseId - Case ID
   * @returns {Promise<Array>} Emergency history
   */
  async getEmergencyHistory(caseId) {
    const emergencies = await prisma.emergency.findMany({
      where: { caseId },
      include: {
        markedByUser: {
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

    return emergencies;
  }
}

module.exports = new EmergencyService();
