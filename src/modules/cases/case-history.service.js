/**
 * Case History Service
 * Tracks complete audit trail for all case modifications
 */

const prisma = require('../../prismaClient');

class CaseHistoryService {
  /**
   * Record case creation
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who created the case
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Created history entry
   */
  async recordCaseCreation(caseId, userId, metadata = {}) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'created',
        description: 'Case created',
        metadata,
      },
    });

    return history;
  }

  /**
   * Record status change
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who changed status
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Created history entry
   */
  async recordStatusChange(caseId, userId, oldStatus, newStatus) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'status_changed',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        previousStatus: oldStatus,
        newStatus: newStatus,
      },
    });

    // Also record in CaseStatusHistory for backward compatibility
    await prisma.caseStatusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        oldStatus,
        newStatus,
      },
    });

    return history;
  }

  /**
   * Record case assignment
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who performed assignment
   * @param {Object} assignedTo - Assignment details {userId, teamId}
   * @returns {Promise<Object>} Created history entry
   */
  async recordAssignment(caseId, userId, assignedTo) {
    let description = 'Case assigned';
    const metadata = {};

    if (assignedTo.userId) {
      const user = await prisma.user.findUnique({
        where: { id: assignedTo.userId },
        select: { name: true, email: true },
      });
      description = `Case assigned to user: ${user?.name || user?.email}`;
      metadata.assignedToUserId = assignedTo.userId;
    }

    if (assignedTo.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: assignedTo.teamId },
        select: { name: true },
      });
      description = `Case assigned to team: ${team?.name}`;
      metadata.assignedToTeamId = assignedTo.teamId;
    }

    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'assigned',
        description,
        metadata,
      },
    });

    return history;
  }

  /**
   * Record case edit
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who edited
   * @param {Object} changes - Changes made
   * @returns {Promise<Object>} Created history entry
   */
  async recordEdit(caseId, userId, changes) {
    const changedFields = Object.keys(changes).join(', ');
    const description = `Case edited: ${changedFields}`;

    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'edited',
        description,
        metadata: changes,
      },
    });

    return history;
  }

  /**
   * Record comment addition
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who commented
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Created history entry
   */
  async recordComment(caseId, userId, commentId) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'commented',
        description: 'Comment added',
        metadata: { commentId },
      },
    });

    return history;
  }

  /**
   * Record emergency marking
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who marked emergency
   * @param {number} level - Emergency level
   * @param {string} reason - Reason for emergency
   * @returns {Promise<Object>} Created history entry
   */
  async recordEmergencyMarked(caseId, userId, level, reason) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'emergency_marked',
        description: `Marked as emergency level ${level}`,
        metadata: { level, reason },
      },
    });

    return history;
  }

  /**
   * Record emergency escalation
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who escalated
   * @param {number} oldLevel - Previous emergency level
   * @param {number} newLevel - New emergency level
   * @returns {Promise<Object>} Created history entry
   */
  async recordEmergencyEscalation(caseId, userId, oldLevel, newLevel) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'emergency_escalated',
        description: `Emergency escalated from level ${oldLevel} to ${newLevel}`,
        metadata: { oldLevel, newLevel },
      },
    });

    return history;
  }

  /**
   * Record emergency resolution
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID who resolved
   * @returns {Promise<Object>} Created history entry
   */
  async recordEmergencyResolved(caseId, userId) {
    const history = await prisma.caseHistory.create({
      data: {
        caseId,
        performedByUserId: userId,
        action: 'emergency_resolved',
        description: 'Emergency resolved',
      },
    });

    return history;
  }

  /**
   * Get case history
   * @param {string} caseId - Case ID
   * @returns {Promise<Array>} Case history entries
   */
  async getCaseHistory(caseId) {
    const history = await prisma.caseHistory.findMany({
      where: { caseId },
      include: {
        performedBy: {
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

    return history;
  }

  /**
   * Get case timeline (formatted for display)
   * @param {string} caseId - Case ID
   * @returns {Promise<Array>} Formatted timeline
   */
  async getCaseTimeline(caseId) {
    const history = await this.getCaseHistory(caseId);

    return history.map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt,
      action: entry.action,
      description: entry.description,
      performedBy: {
        id: entry.performedBy.id,
        name: entry.performedBy.name || entry.performedBy.email,
        role: entry.performedBy.role,
      },
      metadata: entry.metadata,
    }));
  }

  /**
   * Get recent activity for organization
   * @param {string} orgId - Organization ID
   * @param {number} limit - Number of entries to return
   * @returns {Promise<Array>} Recent activity
   */
  async getRecentActivity(orgId, limit = 50) {
    const history = await prisma.caseHistory.findMany({
      where: {
        case: {
          organizationId: orgId,
        },
      },
      include: {
        performedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        case: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }
}

module.exports = new CaseHistoryService();
