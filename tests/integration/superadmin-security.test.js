const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

// Mock Redis
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    status: 'ready',
  };
  return { 
    redisClient: mRedis,
    redisSubscriber: { ...mRedis, status: 'ready' }
  };
});

const { redisClient } = require('../../src/config/redis');

// Mock Env
process.env.SUPERADMIN_SECRET = 'primary-secret';
process.env.SUPERADMIN_SECRET_BACKUP = 'backup-secret';
process.env.SUPERADMIN_RATE_LIMIT = '3';
process.env.SUPERADMIN_JTI_ENABLED = 'true';

describe('SuperAdmin Security Enhancements', () => {
  let adminToken;
  let adminId;
  let orgId;
  let homelessId;

  beforeAll(async () => {
    // Setup Admin User
    const org = await prisma.organization.create({
      data: { name: 'Security Test Org', type: 'NGO' },
    });
    orgId = org.id;

    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `security-admin-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Security Admin',
        role: 'ADMIN',
        organizationId: orgId,
      },
    });
    adminId = admin.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' });
    adminToken = loginRes.body.token;

    const homeless = await prisma.homeless.create({
      data: {
        lat: -31.4201,
        lng: -64.1888,
        apodo: 'Security Subject',
        organizationId: orgId,
        registradoPor: adminId,
      },
    });
    homelessId = homeless.id;
  });

  afterAll(async () => {
    await prisma.homeless.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Double Secret Verification', () => {
    test('Access GRANTED with Primary Secret', async () => {
      redisClient.incr.mockResolvedValue(1); // Rate limit OK
      redisClient.get.mockResolvedValue(null); // JTI OK

      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', 'jti-1');

      expect(res.status).toBe(200);
    });

    test('Access GRANTED with Backup Secret', async () => {
      redisClient.incr.mockResolvedValue(1);
      redisClient.get.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'backup-secret')
        .set('x-superadmin-jti', 'jti-2');

      expect(res.status).toBe(200);
    });

    test('Access DENIED with Incorrect Secret', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'wrong-secret')
        .set('x-superadmin-jti', 'jti-3');

      expect(res.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    test('Access DENIED when Rate Limit Exceeded', async () => {
      redisClient.incr.mockResolvedValue(4); // Limit is 3

      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', 'jti-4');

      expect(res.status).toBe(403); 
    });
  });

  describe('JTI Replay Protection', () => {
    test('Access DENIED when JTI Reused', async () => {
      redisClient.incr.mockResolvedValue(1);
      redisClient.get.mockResolvedValue('1'); // JTI exists

      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', 'used-jti');

      expect(res.status).toBe(403);
    });

    test('Access DENIED when JTI Missing', async () => {
      redisClient.incr.mockResolvedValue(1);

      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret');
        // No JTI header

      expect(res.status).toBe(403);
    });
  });

  describe('Audit Logging', () => {
    test('Should create AuditLog entry on success', async () => {
      redisClient.incr.mockResolvedValue(1);
      redisClient.get.mockResolvedValue(null);

      await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', 'audit-jti');

      // Verify DB
      const log = await prisma.auditLog.findFirst({
        where: {
          userId: adminId,
          action: 'SUPERADMIN_ACCESS',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log.targetType).toBe('SYSTEM');
    });
  });
});
