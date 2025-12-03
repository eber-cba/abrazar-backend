const request = require('supertest');

// Mock Redis
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    disconnect: jest.fn(),
    on: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn((channel, callback) => {
      if (callback) callback(null, 1);
    }),
  };
  return {
    redisClient: mRedis,
    redisSubscriber: mRedis,
  };
});

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'admin-user', role: 'ADMIN' };
    next();
  },
  optionalProtect: (req, res, next) => {
    next();
  },
}));

// Mock Permission Service
jest.mock('../../src/modules/permissions/permission.service', () => ({
  getAllPermissions: jest.fn().mockResolvedValue([
    { id: 'perm-1', name: 'cases:create', description: 'Create cases' },
    { id: 'perm-2', name: 'cases:read', description: 'Read cases' },
  ]),
  getRolePermissions: jest.fn().mockResolvedValue([
    { id: 'perm-1', name: 'cases:create', description: 'Create cases' },
  ]),
  assignRolePermission: jest.fn().mockResolvedValue({ success: true }),
  revokeRolePermission: jest.fn().mockResolvedValue({ success: true }),
  getUserPermissions: jest.fn().mockResolvedValue([]),
  assignPermission: jest.fn().mockResolvedValue({ success: true }),
  revokePermission: jest.fn().mockResolvedValue({ success: true }),
  createPermission: jest.fn().mockResolvedValue({ id: 'new-perm', name: 'test:permission' }),
}));

// Mock Legacy Permission Service (used by middleware)
jest.mock('../../src/services/permission.service', () => ({
  hasRole: jest.fn().mockResolvedValue(true),
}));

const app = require('../../src/app');

describe('Permission Integration', () => {
  describe('GET /api/permissions', () => {
    it('should return all permissions for admin', async () => {
      const res = await request(app)
        .get('/api/permissions')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('permissions');
    });
  });

  describe('GET /api/permissions/roles/:role', () => {
    it('should return permissions for a specific role', async () => {
      const res = await request(app)
        .get('/api/permissions/roles/COORDINATOR')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('permissions');
    });
  });
});
