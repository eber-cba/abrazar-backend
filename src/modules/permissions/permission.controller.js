const permissionService = require('./permission.service');
const AppError = require('../../utils/errors');

class PermissionController {
  /**
   * Get all available permissions
   */
  async getAllPermissions(req, res, next) {
    try {
      const permissions = await permissionService.getAllPermissions();
      
      res.status(200).json({
        status: 'success',
        results: permissions.length,
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(req, res, next) {
    try {
      const { role } = req.params;
      const permissions = await permissionService.getRolePermissions(role);
      
      res.status(200).json({
        status: 'success',
        results: permissions.length,
        data: { role, permissions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign permission to a role
   */
  async assignRolePermission(req, res, next) {
    try {
      const { role } = req.params;
      const { permissionName } = req.body;
      
      const rolePermission = await permissionService.assignRolePermission(role, permissionName);
      
      res.status(201).json({
        status: 'success',
        data: { rolePermission },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove permission from a role
   */
  async revokeRolePermission(req, res, next) {
    try {
      const { role, permission } = req.params;
      
      await permissionService.revokeRolePermission(role, permission);
      
      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get permissions for a specific user
   */
  async getUserPermissions(req, res, next) {
    try {
      const { userId } = req.params;
      const permissions = await permissionService.getUserPermissions(userId);
      
      res.status(200).json({
        status: 'success',
        results: permissions.length,
        data: { userId, permissions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grant permission to a user
   */
  async assignUserPermission(req, res, next) {
    try {
      const { userId } = req.params;
      const { permissionName } = req.body;
      
      const userPermission = await permissionService.assignPermission(userId, permissionName);
      
      res.status(201).json({
        status: 'success',
        data: { userPermission },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke permission from a user
   */
  async revokeUserPermission(req, res, next) {
    try {
      const { userId, permission } = req.params;
      
      await permissionService.revokePermission(userId, permission);
      
      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new permission
   */
  async createPermission(req, res, next) {
    try {
      const { name, description, resource, action } = req.body;
      
      const permission = await permissionService.createPermission(
        name,
        description,
        resource,
        action
      );
      
      res.status(201).json({
        status: 'success',
        data: { permission },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PermissionController();
