const permissionService = require('../../src/modules/permissions/permission.service');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    rolePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    userPermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

describe('PermissionService', () => {
  const prisma = new PrismaClient();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true if user has role-based permission', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.rolePermission.findFirst.mockResolvedValue({ id: '1' });
      prisma.userPermission.findFirst.mockResolvedValue(null);

      const result = await permissionService.hasPermission('user-1', 'cases:create');

      expect(result).toBe(true);
      expect(prisma.rolePermission.findFirst).toHaveBeenCalled();
    });

    it('should return false if user has no permission', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'VOLUNTEER' });
      prisma.rolePermission.findFirst.mockResolvedValue(null);
      prisma.userPermission.findFirst.mockResolvedValue(null);

      const result = await permissionService.hasPermission('user-1', 'cases:delete');

      expect(result).toBe(false);
    });

    it('should respect user-specific permission overrides', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'VOLUNTEER' });
      prisma.rolePermission.findFirst.mockResolvedValue(null);
      prisma.userPermission.findFirst.mockResolvedValue({ granted: true });

      const result = await permissionService.hasPermission('user-1', 'cases:create');

      expect(result).toBe(true);
    });

    it('should revoke permission if user override is false', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.rolePermission.findFirst.mockResolvedValue({ id: '1' });
      prisma.userPermission.findFirst.mockResolvedValue({ granted: false });

      const result = await permissionService.hasPermission('user-1', 'cases:create');

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return combined role and user permissions', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'COORDINATOR' });
      prisma.rolePermission.findMany.mockResolvedValue([
        { permission: { name: 'cases:read' } },
        { permission: { name: 'cases:create' } },
      ]);
      prisma.userPermission.findMany.mockResolvedValue([
        { permission: { name: 'users:read' }, granted: true },
      ]);

      const result = await permissionService.getUserPermissions('user-1');

      expect(result).toHaveLength(3);
    });
  });

  describe('assignPermission', () => {
    it('should assign permission to user', async () => {
      prisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', name: 'cases:create' });
      prisma.userPermission.upsert.mockResolvedValue({ id: 'up-1' });

      await permissionService.assignPermission('user-1', 'cases:create');

      expect(prisma.userPermission.upsert).toHaveBeenCalled();
    });
  });
});
