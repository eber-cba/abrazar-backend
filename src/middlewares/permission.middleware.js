/**
 * Permission Middleware
 * Role-based access control middlewares
 */

const permissionService = require('../services/permission.service');
const prisma = require('../prismaClient'); // Import prisma for existence checks
const newPermissionService = require('../modules/permissions/permission.service');
const AppError = require('../utils/errors');
const env = require('../config/env');
const logger = require('../config/logger');
const { redisClient } = require('../config/redis');

// Helper for admin bypass logging and checks
const logAdminBypass = async (req, context) => {
  // Check if user is ADMIN
  if (!req.user || req.user.role !== 'ADMIN') {
    return false;
  }

  // If already verified for this request, skip checks
  if (req.user.isSuperAdmin) {
    return true;
  }

  // Check for SuperAdmin secret header
  const secretHeader = req.headers['x-superadmin-secret'];
  
  if (!secretHeader) {
    return false;
  }

  // Double Secret Check
  const isPrimaryValid = secretHeader === env.SUPERADMIN_SECRET;
  const isBackupValid = env.SUPERADMIN_SECRET_BACKUP && secretHeader === env.SUPERADMIN_SECRET_BACKUP;

  if (!isPrimaryValid && !isBackupValid) {
    logger.warn(`[AUTH] Invalid SuperAdmin secret attempt by user ${req.user.id}`);
    return false;
  }

  // Rate Limiting (3 req/min per IP)
  const ip = req.ip || req.connection.remoteAddress;
  const rateLimitKey = `superadmin:ratelimit:${ip}`;
  
  try {
    if (redisClient) {
      const current = await redisClient.incr(rateLimitKey);
      if (current === 1) {
        await redisClient.expire(rateLimitKey, 60);
      }
      
      if (current > env.SUPERADMIN_RATE_LIMIT) {
        logger.warn(`[AUTH] SuperAdmin rate limit exceeded for IP ${ip}`);
        return false; // Deny access effectively
      }
    }
  } catch (err) {
    logger.error('[AUTH] Redis error in rate limit check', err);
    // Fail safe: allow if redis down? Or deny? 
    // Usually fail open for admins, but secure mode implies strictness. 
    // Let's allow but log error to avoid locking out admin if redis fails.
  }

  // JTI Rotation (Anti-Replay)
  if (env.SUPERADMIN_JTI_ENABLED) {
    const jti = req.headers['x-superadmin-jti'];
    if (!jti) {
      logger.warn(`[AUTH] Missing JTI for SuperAdmin request by user ${req.user.id}`);
      return false;
    }

    const jtiKey = `superadmin:jti:${jti}`;
    try {
      if (redisClient) {
        const exists = await redisClient.get(jtiKey);
        if (exists) {
          logger.warn(`[AUTH] Replay attack detected (JTI reused) by user ${req.user.id}`);
          return false;
        }
        // Store JTI for 5 minutes
        await redisClient.set(jtiKey, '1', 'EX', 300);
      }
    } catch (err) {
      logger.error('[AUTH] Redis error in JTI check', err);
    }
  }

  // Mark user as SuperAdmin for this request
  req.user.isSuperAdmin = true;
  
  // Audit Logging
  const logMsg = `[SUPERADMIN] user=${req.user.id} org=${req.user.organizationId || 'null'} action=${req.method} path=${req.originalUrl} timestamp=${new Date().toISOString()}`;
  
  // 1. Console & File Log
  if (logger.superAdminLogger) {
    logger.superAdminLogger.info(logMsg);
  } else {
    // Fallback if logger structure is unexpected
    logger.info(logMsg); 
  }

  // 2. DB Audit Log
  try {
    // Fire and forget to not block response, or await if strict
    prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SUPERADMIN_ACCESS',
        targetType: 'SYSTEM',
        ipAddress: ip,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          context: context
        }
      }
    }).catch(err => logger.error('[AUDIT] Failed to create DB audit log', err));
  } catch (err) {
    logger.error('[AUDIT] Error initiating DB audit log', err);
  }

  return true;
};

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

      // GLOBAL ADMIN BYPASS
      if (await logAdminBypass(req, 'requireRole')) {
        return next();
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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canViewCase')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canEditCase')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canAssignCase')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canCloseCase')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canManageTeam')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canViewStatistics')) {
      return next();
    }

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
    // GLOBAL ADMIN BYPASS
    if (await logAdminBypass(req, 'canCreateSubUsers')) {
      return next();
    }

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
    if (await logAdminBypass(req, 'canManageServicePoint')) {
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

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      // GLOBAL ADMIN BYPASS
      if (await logAdminBypass(req, `requirePermission:${permissionName}`)) {
        return next();
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

      // GLOBAL ADMIN BYPASS
      if (await logAdminBypass(req, `requireAnyPermission:${permissionNames.join(',')}`)) {
        return next();
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

      // GLOBAL ADMIN BYPASS
      if (await logAdminBypass(req, `requireAllPermissions:${permissionNames.join(',')}`)) {
        return next();
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
