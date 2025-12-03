const request = require('supertest');

// Mock everything BEFORE requiring app
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

jest.mock('../../src/middlewares/auth.middleware', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'test-user', role: 'ADMIN' };
    req.token = 'valid-token';
    next();
  },
  optionalProtect: (req, res, next) => {
    next();
  },
}));

// Mock Session Service
jest.mock('../../src/modules/sessions/session.service', () => ({
  getActiveSessions: jest.fn().mockResolvedValue([
    { id: 'session-1', deviceInfo: 'Test Device', lastActive: new Date() }
  ]),
  revokeSession: jest.fn().mockResolvedValue(true),
  revokeAllUserSessions: jest.fn().mockResolvedValue(true),
}));

const app = require('../../src/app');

describe('Session Integration', () => {
  describe('GET /api/sessions/my', () => {
    it('should return active sessions', async () => {
      const res = await request(app)
        .get('/api/sessions/my')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('sessions');
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should revoke a specific session', async () => {
      await request(app)
        .delete('/api/sessions/session-1')
        .set('Authorization', 'Bearer test-token')
        .expect(204);
    });
  });

  describe('DELETE /api/sessions/all', () => {
    it('should revoke all sessions', async () => {
      await request(app)
        .delete('/api/sessions/all')
        .set('Authorization', 'Bearer test-token')
        .expect(204);
    });
  });
});
