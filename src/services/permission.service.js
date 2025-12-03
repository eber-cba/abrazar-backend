/**
 * Permission Service
 * Centralized permission checking for role-based access control and multi-tenant isolation
 */

const prisma = require('../prismaClient');

class PermissionService {
  /**
   * Check if user can view a case
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canViewCase(userId, caseId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can view all
    if (user.role === 'ADMIN') return true;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true, createdBy: true },
    });

    if (!caseData) return false;

    // Public users can only view cases they created or public cases
    if (!user.organizationId) {
      return caseData.createdBy === userId || !caseData.organizationId;
    }

    // Organization members can view cases in their organization
    return caseData.organizationId === user.organizationId;
  }

  /**
   * Check if user can edit a case
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canEditCase(userId, caseId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can edit all
    if (user.role === 'ADMIN') return true;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true, createdBy: true, assignedToUserId: true },
    });

    if (!caseData) return false;

    // Public users can only edit cases they created
    if (!user.organizationId) {
      return caseData.createdBy === userId;
    }

    // Organization admins and coordinators can edit cases in their organization
    if (
      ['ORGANIZATION_ADMIN', 'COORDINATOR', 'SOCIAL_WORKER'].includes(user.role) &&
      caseData.organizationId === user.organizationId
    ) {
      return true;
    }

    // Assigned users can edit their cases
    if (caseData.assignedToUserId === userId) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can assign a case
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canAssignCase(userId, caseId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can assign all
    if (user.role === 'ADMIN') return true;

    // Only organization admins and coordinators can assign cases
    if (!['ORGANIZATION_ADMIN', 'COORDINATOR'].includes(user.role)) {
      return false;
    }

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true },
    });

    if (!caseData) return false;

    // Must be in same organization
    return caseData.organizationId === user.organizationId;
  }

  /**
   * Check if user can close a case
   * @param {string} userId - User ID
   * @param {string} caseId - Case ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canCloseCase(userId, caseId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can close all
    if (user.role === 'ADMIN') return true;

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true, createdBy: true },
    });

    if (!caseData) return false;

    // Public users can close cases they created
    if (!user.organizationId) {
      return caseData.createdBy === userId;
    }

    // Organization admins, coordinators, and social workers can close cases
    if (
      ['ORGANIZATION_ADMIN', 'COORDINATOR', 'SOCIAL_WORKER'].includes(user.role) &&
      caseData.organizationId === user.organizationId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can manage a team
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canManageTeam(userId, teamId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can manage all teams
    if (user.role === 'ADMIN') return true;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    });

    if (!team) return false;

    // Organization admins can manage teams in their organization
    if (
      user.role === 'ORGANIZATION_ADMIN' &&
      team.organizationId === user.organizationId
    ) {
      return true;
    }

    // Team leaders can manage their team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        roleInTeam: 'LEADER',
      },
    });

    return !!membership;
  }

  /**
   * Check if user can view statistics
   * @param {string} userId - User ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canViewStatistics(userId, orgId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can view all statistics
    if (user.role === 'ADMIN') return true;

    // Organization admins, coordinators, and data analysts can view their org stats
    if (
      ['ORGANIZATION_ADMIN', 'COORDINATOR', 'DATA_ANALYST'].includes(user.role) &&
      user.organizationId === orgId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has specific role(s)
   * @param {string} userId - User ID
   * @param {string|Array<string>} roles - Role or array of roles
   * @returns {Promise<boolean>} Has role
   */
  async hasRole(userId, roles) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }

  /**
   * Check if user is organization admin
   * @param {string} userId - User ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} Is organization admin
   */
  async isOrganizationAdmin(userId, orgId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    return (
      user.role === 'ORGANIZATION_ADMIN' && user.organizationId === orgId
    );
  }

  /**
   * Get user's organization ID
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Organization ID or null
   */
  async getUserOrganizationId(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    return user?.organizationId || null;
  }

  /**
   * Check if user can create sub-users in organization
   * @param {string} userId - User ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} Permission granted
   */
  async canCreateSubUsers(userId, orgId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can create users anywhere
    if (user.role === 'ADMIN') return true;

    // Only organization admins can create sub-users
    return (
      user.role === 'ORGANIZATION_ADMIN' && user.organizationId === orgId
    );
  }

  /**
   * Verify multi-tenant isolation
   * Ensures user can only access data from their organization
   * @param {string} userId - User ID
   * @param {string} targetOrgId - Target organization ID
   * @returns {Promise<boolean>} Access allowed
   */
  async verifyOrganizationAccess(userId, targetOrgId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user) return false;

    // Global admin can access all organizations
    if (user.role === 'ADMIN') return true;

    // Public users (no organization) cannot access organization data
    if (!user.organizationId) return false;

    // Users can only access their own organization
    return user.organizationId === targetOrgId;
  }
  /**
   * Check if user can manage service points
   */
  async canManageServicePoint(userId, organizationId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true }
    });

    if (!user) return false;

    // Global admin can manage everything
    if (user.role === 'ADMIN') return true;

    // Organization admin and coordinator can manage their org's points
    if (['ORGANIZATION_ADMIN', 'COORDINATOR'].includes(user.role)) {
      return user.organizationId === organizationId;
    }

    return false;
  }
}

module.exports = new PermissionService();
