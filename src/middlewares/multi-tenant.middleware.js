/**
 * Multi-Tenant Middleware
 * Ensures complete data isolation between organizations
 */

const permissionService = require('../services/permission.service');

/**
 * Inject organization filter into request context
 * This middleware ensures users can only access data from their organization
 */
const multiTenantMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // No user, skip multi-tenant filtering
    }

    // Get user's organization ID
    const organizationId = await permissionService.getUserOrganizationId(
      req.user.id
    );

    // Attach to request for use in controllers
    req.organizationId = organizationId;

    // Global admins can bypass organization filtering
    const isAdmin = await permissionService.hasRole(req.user.id, 'ADMIN');
    req.isGlobalAdmin = isAdmin;

    next();
  } catch (error) {
    console.error('[MULTI-TENANT ERROR]', error);
    next(error);
  }
};

/**
 * Require organization membership
 * Ensures user belongs to an organization
 */
const requireOrganization = async (req, res, next) => {
  try {
    if (req.isGlobalAdmin) {
      return next(); // Global admins bypass this check
    }

    if (!req.organizationId) {
      return res.status(403).json({
        status: 'fail',
        message: 'This action requires organization membership',
      });
    }

    next();
  } catch (error) {
    console.error('[REQUIRE-ORG ERROR]', error);
    next(error);
  }
};

/**
 * Verify organization access for specific organization ID
 * Used when accessing organization-specific resources
 */
const verifyOrganizationAccess = (paramName = 'orgId') => {
  return async (req, res, next) => {
    try {
      const targetOrgId = req.params[paramName] || req.body[paramName];

      if (!targetOrgId) {
        return res.status(400).json({
          status: 'fail',
          message: 'Organization ID is required',
        });
      }

      // Global admins can access any organization
      if (req.isGlobalAdmin) {
        return next();
      }

      // Verify user has access to this organization
      const hasAccess = await permissionService.verifyOrganizationAccess(
        req.user.id,
        targetOrgId
      );

      if (!hasAccess) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied to this organization',
        });
      }

      next();
    } catch (error) {
      console.error('[VERIFY-ORG-ACCESS ERROR]', error);
      next(error);
    }
  };
};

/**
 * Auto-inject organization ID into request body for creation
 */
const injectOrganizationId = (req, res, next) => {
  if (req.organizationId && !req.body.organizationId) {
    req.body.organizationId = req.organizationId;
  }
  next();
};

module.exports = {
  multiTenantMiddleware,
  requireOrganization,
  verifyOrganizationAccess,
  injectOrganizationId,
};
