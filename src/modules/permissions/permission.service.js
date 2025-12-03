const { PrismaClient} = require('@prisma/client');

const prisma = new PrismaClient();

class PermissionService {
  /**
   * Check if a user has a specific permission
   * Checks both role-based and user-specific permissions
   */
  async hasPermission(userId, permissionName) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Check role-based permissions
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: user.role,
        permission: {
          name: permissionName,
        },
      },
    });

    // Check user-specific permission overrides
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permissionName,
        },
      },
    });

    // User-specific permission overrides role permission
    if (userPermission) {
      return userPermission.granted;
    }

    return !!rolePermission;
  }

  /**
   * Get all permissions for a user (role + direct)
   */
  async getUserPermissions(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return [];

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    // Get user-specific permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    // Combine and deduplicate
    const permissionMap = new Map();

    // Add role permissions
    rolePermissions.forEach((rp) => {
      permissionMap.set(rp.permission.name, rp.permission);
    });

    // Override with user permissions
    userPermissions.forEach((up) => {
      if (up.granted) {
        permissionMap.set(up.permission.name, up.permission);
      } else {
        // Revoked permission
        permissionMap.delete(up.permission.name);
      }
    });

    return Array.from(permissionMap.values());
  }

  /**
   * Assign a permission directly to a user
   */
  async assignPermission(userId, permissionName) {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error(`Permission "${permissionName}" not found`);
    }

    return await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      create: {
        userId,
        permissionId: permission.id,
        granted: true,
      },
      update: {
        granted: true,
      },
    });
  }

  /**
   * Revoke a permission from a user
   */
  async revokePermission(userId, permissionName) {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error(`Permission "${permissionName}" not found`);
    }

    return await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      create: {
        userId,
        permissionId: permission.id,
        granted: false,
      },
      update: {
        granted: false,
      },
    });
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(role) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Assign a permission to a role
   */
  async assignRolePermission(role, permissionName) {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error(`Permission "${permissionName}" not found`);
    }

    return await prisma.rolePermission.create({
      data: {
        role,
        permissionId: permission.id,
      },
    });
  }

  /**
   * Remove a permission from a role
   */
  async revokeRolePermission(role, permissionName) {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new Error(`Permission "${permissionName}" not found`);
    }

    return await prisma.rolePermission.deleteMany({
      where: {
        role,
        permissionId: permission.id,
      },
    });
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Create a new permission
   */
  async createPermission(name, description, resource, action) {
    return await prisma.permission.create({
      data: {
        name,
        description,
        resource,
        action,
      },
    });
  }
}

module.exports = new PermissionService();
