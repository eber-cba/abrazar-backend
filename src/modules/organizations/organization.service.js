/**
 * Organization Service
 * Handles all organization-related business logic for municipalities, NGOs, and generic organizations
 */

const prisma = require('../../prismaClient');
const { logAudit } = require('../audit/audit.service');
const bcrypt = require('bcrypt');
const AppError = require('../../utils/errors');

class OrganizationService {
  /**
   * Create a new organization
   * @param {Object} data - Organization data
   * @returns {Promise<Object>} Created organization
   */
  async createOrganization(data) {
    const organization = await prisma.organization.create({
      data: {
        type: data.type,
        name: data.name,
        city: data.city,
        province: data.province,
        country: data.country || 'Argentina',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });

    return organization;
  }

  /**
   * Get organization by ID
   * @param {string} id - Organization ID
   * @returns {Promise<Object>} Organization
   */
  async getOrganizationById(id) {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        teams: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        zones: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            users: true,
            teams: true,
            zones: true,
            cases: true,
          },
        },
      },
    });

    return organization;
  }

  /**
   * Update organization
   * @param {string} id - Organization ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated organization
   */
  async updateOrganization(id, data) {
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        province: data.province,
        country: data.country,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });

    return organization;
  }

  /**
   * List all organizations (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of organizations
   */
  async listOrganizations(filters = {}) {
    const where = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.province) {
      where.province = { contains: filters.province, mode: 'insensitive' };
    }

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            teams: true,
            zones: true,
            cases: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return organizations;
  }

  /**
   * Delete organization
   * @param {string} id - Organization ID
   * @returns {Promise<Object>} Deleted organization
   */
  async deleteOrganization(id) {
    const organization = await prisma.organization.delete({
      where: { id },
    });

    return organization;
  }

  /**
   * Get organization members
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} List of members
   */
  async getOrganizationMembers(orgId) {
    const members = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members;
  }

  /**
   * Add member to organization
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<Object>} Updated user
   */
  async addMemberToOrganization(orgId, userId, role) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: orgId,
        role: role || 'VOLUNTEER',
      },
    });

    return user;
  }

  /**
   * Create a new user for the organization
   * @param {string} orgId - Organization ID
   * @param {Object} userData - User data (email, password, name, role)
   * @returns {Promise<Object>} Created user
   */
  async createUserForOrganization(orgId, userData) {
    const { email, password, name, role } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'VOLUNTEER',
        organizationId: orgId,
        acceptedTerms: true, // Created by admin, assume terms accepted or handled otherwise
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        organizationId: true,
      },
    });

    return user;
  }

  /**
   * Update organization member
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update (role, name)
   * @returns {Promise<Object>} Updated user
   */
  async updateOrganizationMember(orgId, userId, updateData) {
    // Verify user belongs to this organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
      },
    });

    if (!user) {
      throw new AppError('User not found in this organization', 404);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: updateData.role,
        name: updateData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    return updatedUser;
  }

  /**
   * Remove member from organization
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async removeMemberFromOrganization(orgId, userId) {
    // Verify user belongs to this organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: orgId,
      },
    });

    if (!user) {
      throw new AppError('User not found in this organization', 404);
    }

    // Remove from organization
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        role: 'PUBLIC', // Revert to public user
      },
    });

    return updatedUser;
  }

  /**
   * Get organization statistics
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Organization statistics
   */
  async getOrganizationStatistics(orgId) {
    const [
      totalUsers,
      totalTeams,
      totalZones,
      totalCases,
      activeCases,
      resolvedCases,
      emergencyCases,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.team.count({ where: { organizationId: orgId } }),
      prisma.zone.count({ where: { organizationId: orgId } }),
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
    ]);

    return {
      totalUsers,
      totalTeams,
      totalZones,
      totalCases,
      activeCases,
      resolvedCases,
      emergencyCases,
    };
  }
}

module.exports = new OrganizationService();
