/**
 * Permission Middleware
 * Role-based access control middlewares
 */

const permissionService = require('../services/permission.service');
const prisma = require('../prismaClient'); // Import prisma for existence checks

/**
 * Require specific role(s)
 * @param {...string} roles - Required roles
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required',
        });
      }

      const hasRole = await permissionService.hasRole(req.user.id, roles);

      if (!hasRole) {
        return res.status(403).json({
          status: 'fail',
          message: `Requires one of the following roles: ${roles.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('[REQUIRE-ROLE ERROR]', error);
      next(error);
    }
  };
};

/**
 * Require permission to view case
 */
const canViewCase = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.params.caseId;

    if (!caseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Case ID is required',
      });
    }

    // Check if case exists first
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Case not found',
      });
    }

    const hasPermission = await permissionService.canViewCase(
      req.user.id,
      caseId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view this case',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-VIEW-CASE ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to edit case
 */
const canEditCase = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.params.caseId;

    if (!caseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Case ID is required',
      });
    }

    // Check if case exists first
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Case not found',
      });
    }

    const hasPermission = await permissionService.canEditCase(
      req.user.id,
      caseId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to edit this case',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-EDIT-CASE ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to assign case
 */
const canAssignCase = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.params.caseId;

    if (!caseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Case ID is required',
      });
    }

    // Check if case exists first
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Case not found',
      });
    }

    const hasPermission = await permissionService.canAssignCase(
      req.user.id,
      caseId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to assign this case',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-ASSIGN-CASE ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to close case
 */
const canCloseCase = async (req, res, next) => {
  try {
    const caseId = req.params.id || req.params.caseId;

    if (!caseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Case ID is required',
      });
    }

    // Check if case exists first
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Case not found',
      });
    }

    const hasPermission = await permissionService.canCloseCase(
      req.user.id,
      caseId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to close this case',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-CLOSE-CASE ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to manage team
 */
const canManageTeam = async (req, res, next) => {
  try {
    const teamId = req.params.id || req.params.teamId;

    if (!teamId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Team ID is required',
      });
    }

    // Check if team exists first
    const teamExists = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!teamExists) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found',
      });
    }

    const hasPermission = await permissionService.canManageTeam(
      req.user.id,
      teamId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to manage this team',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-MANAGE-TEAM ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to view statistics
 */
const canViewStatistics = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.organizationId;

    if (!orgId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Organization ID is required',
      });
    }

    const hasPermission = await permissionService.canViewStatistics(
      req.user.id,
      orgId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view statistics',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-VIEW-STATISTICS ERROR]', error);
    next(error);
  }
};

/**
 * Require permission to create sub-users
 */
const canCreateSubUsers = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.params.id || req.body.organizationId || req.organizationId;

    if (!orgId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Organization ID is required',
      });
    }

    const hasPermission = await permissionService.canCreateSubUsers(
      req.user.id,
      orgId
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only organization admins can create sub-users',
      });
    }

    next();
  } catch (error) {
    console.error('[CAN-CREATE-SUB-USERS ERROR]', error);
    next(error);
  }
};




/**
 * Middleware to check if user can manage service points
 */
const canManageServicePoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { organizationId } = req; // From multi-tenant middleware

    // If global admin, allow
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check permission via service
    const hasPermission = await permissionService.canManageServicePoint(userId, organizationId);
    
    if (!hasPermission) {
      return next(new AppError('You do not have permission to manage service points for this organization', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// NEW RBAC/PBAC MIDDLEWARE
// ============================================================================

const newPermissionService = require('../modules/permissions/permission.service');
const AppError = require('../utils/errors');

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const hasPermission = await newPermissionService.hasPermission(
        req.user.id,
        permissionName
      );

      if (!hasPermission) {
        return next(
          new AppError(`Insufficient permissions. Required: ${permissionName}`, 403)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has ANY of the required permissions
 */
const requireAnyPermission = (...permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      for (const permissionName of permissionNames) {
        const hasPermission = await newPermissionService.hasPermission(
          req.user.id,
          permissionName
        );
        if (hasPermission) {
          return next();
        }
      }

      return next(
        new AppError(
          `Insufficient permissions. Required one of: ${permissionNames.join(', ')}`,
          403
        )
      );
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has ALL of the required permissions
 */
const requireAllPermissions = (...permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      for (const permissionName of permissionNames) {
        const hasPermission = await newPermissionService.hasPermission(
          req.user.id,
          permissionName
        );
        if (!hasPermission) {
          return next(
            new AppError(
              `Insufficient permissions. Required: ${permissionName}`,
              403
            )
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireRole,
  canViewCase,
  canEditCase,
  canAssignCase,
  canCloseCase,
  canManageTeam,
  canViewStatistics,
  canCreateSubUsers,
  canManageServicePoint,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
};
