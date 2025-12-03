const sessionService = require('../../src/modules/sessions/session.service');
const { redisClient } = require('../../src/config/redis');
const { PrismaClient } = require('@prisma/client');

// Mock Redis
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    redisClient: mRedis,
  };
});

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    userSession: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    revokedToken: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

describe('SessionService', () => {
  const prisma = new PrismaClient();

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (redisClient.disconnect) await redisClient.disconnect();
  });

  describe('createSession', () => {
    it('should create a session in DB and Redis', async () => {
      const userId = 'user-1';
      const token = 'token-123';
      const sessionData = { id: 'session-1', userId, token, createdAt: new Date() };
      
      prisma.userSession.create.mockResolvedValue(sessionData);

      await sessionService.createSession(userId, token, 'agent', '127.0.0.1');

      expect(prisma.userSession.create).toHaveBeenCalled();
      expect(redisClient.sadd).toHaveBeenCalledWith(`user_sessions:${userId}`, sessionData.id);
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('session:'),
        expect.any(String),
        'EX',
        expect.any(Number)
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke session in Redis and DB', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      
      prisma.userSession.findUnique.mockResolvedValue({ id: sessionId, token: 'token-123' });

      await sessionService.revokeSession(sessionId, userId);

      expect(redisClient.del).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(redisClient.srem).toHaveBeenCalledWith(`user_sessions:${userId}`, sessionId);
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isValid: false },
      });
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true if token is in Redis', async () => {
      redisClient.get.mockResolvedValue('{"revoked": true}');
      const result = await sessionService.isTokenRevoked('revoked-token');
      expect(result).toBe(true);
    });

    it('should return false if token is not in Redis', async () => {
      redisClient.get.mockResolvedValue(null);
      const result = await sessionService.isTokenRevoked('valid-token');
      expect(result).toBe(false);
    });
  });
});
