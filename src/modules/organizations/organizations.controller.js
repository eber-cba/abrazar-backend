/**
 * Organizations Controller
 * Handles HTTP requests for organization management
 */

const organizationService = require('./organization.service');
const { logAudit } = require('../audit/audit.service');

class OrganizationsController {
  /**
   * Create organization
   * POST /organizations
   */
  async createOrganization(req, res, next) {
    try {
      const { type, name, city, province, country, contactEmail, contactPhone } =
        req.body;

      const organization = await organizationService.createOrganization({
        type,
        name,
        city,
        province,
        country,
        contactEmail,
        contactPhone,
      });

      await logAudit(
        req.user.id,
        'create_organization',
        'organization',
        organization.id,
        { type, name },
        req.ip
      );

      res.status(201).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List organizations
   * GET /organizations
   */
  async listOrganizations(req, res, next) {
    try {
      const { type, city, province } = req.query;

      const organizations = await organizationService.listOrganizations({
        type,
        city,
        province,
      });

      res.status(200).json({
        status: 'success',
        results: organizations.length,
        data: { organizations },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   * GET /organizations/:id
   */
  async getOrganization(req, res, next) {
    try {
      const { id } = req.params;

      const organization = await organizationService.getOrganizationById(id);

      if (!organization) {
        return res.status(404).json({
          status: 'fail',
          message: 'Organization not found',
        });
      }

      res.status(200).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   * PATCH /organizations/:id
   */
  async updateOrganization(req, res, next) {
    try {
      const { id } = req.params;
      const { name, city, province, country, contactEmail, contactPhone } =
        req.body;

      const organization = await organizationService.updateOrganization(id, {
        name,
        city,
        province,
        country,
        contactEmail,
        contactPhone,
      });

      await logAudit(
        req.user.id,
        'update_organization',
        'organization',
        id,
        req.body,
        req.ip
      );

      res.status(200).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organization
   * DELETE /organizations/:id
   */
  async deleteOrganization(req, res, next) {
    try {
      const { id } = req.params;

      await organizationService.deleteOrganization(id);

      await logAudit(
        req.user.id,
        'delete_organization',
        'organization',
        id,
        null,
        req.ip
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization members
   * GET /organizations/:id/members
   */
  async getMembers(req, res, next) {
    try {
      const { id } = req.params;

      const members = await organizationService.getOrganizationMembers(id);

      res.status(200).json({
        status: 'success',
        results: members.length,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to organization (existing user)
   * POST /organizations/:id/members
   */
  async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      const user = await organizationService.addMemberToOrganization(
        id,
        userId,
        role
      );

      await logAudit(
        req.user.id,
        'add_organization_member',
        'organization',
        id,
        { userId, role },
        req.ip
      );

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user for organization
   * POST /organizations/:id/users
   */
  async createUser(req, res, next) {
    try {
      const { id } = req.params;
      const { email, password, name, role } = req.body;

      const user = await organizationService.createUserForOrganization(id, {
        email,
        password,
        name,
        role,
      });

      await logAudit(
        req.user.id,
        'create_organization_user',
        'organization',
        id,
        { email, role },
        req.ip
      );

      res.status(201).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization member
   * PATCH /organizations/:id/users/:userId
   */
  async updateMember(req, res, next) {
    try {
      const { id, userId } = req.params;
      const { role, name } = req.body;

      const user = await organizationService.updateOrganizationMember(id, userId, {
        role,
        name,
      });

      await logAudit(
        req.user.id,
        'update_organization_member',
        'organization',
        id,
        { userId, role, name },
        req.ip
      );

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from organization
   * DELETE /organizations/:id/members/:userId
   */
  async removeMember(req, res, next) {
    try {
      const { id, userId } = req.params;

      await organizationService.removeMemberFromOrganization(id, userId);

      await logAudit(
        req.user.id,
        'remove_organization_member',
        'organization',
        id,
        { userId },
        req.ip
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization statistics
   * GET /organizations/:id/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const { id } = req.params;

      const statistics = await organizationService.getOrganizationStatistics(id);

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization user count
   * GET /organizations/:id/user-count
   */
  async getUserCount(req, res, next) {
    try {
      const { id } = req.params;

      const statistics = await organizationService.getOrganizationStatistics(id);

      res.status(200).json({
        status: 'success',
        data: {
          totalUsers: statistics.totalUsers,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrganizationsController();
