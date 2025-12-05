const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

// Mock Env Module
jest.mock('../../src/config/env', () => ({
  SUPERADMIN_SECRET: 'primary-secret',
  SUPERADMIN_SECRET_BACKUP: 'backup-secret',
  SUPERADMIN_RATE_LIMIT: 3,
  SUPERADMIN_JTI_ENABLED: true,
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PORT: 3000,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5434/abrazar_prod',
}));

// Mock Redis inside factory to avoid hoisting issues
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    status: 'ready',
  };
  return { 
    redisClient: mRedis,
    redisSubscriber: { ...mRedis, status: 'ready', subscribe: jest.fn() }
  };
});

const { redisClient } = require('../../src/config/redis');

describe('SuperAdmin Security Enhancements', () => {
  let adminToken;
  let adminId;
  let orgId;

  beforeAll(async () => {
    // Setup Admin User (once for all tests)
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

    // Mock Redis for login (session creation)
    redisClient.sadd.mockResolvedValue(1);
    redisClient.set.mockResolvedValue('OK');
    redisClient.get.mockResolvedValue(null); // No revoked token

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' });

    if (loginRes.status !== 200) {
      console.error('Login failed:', JSON.stringify(loginRes.body, null, 2));
    }
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Clean up everything
    await prisma.auditLog.deleteMany({ where: { userId: adminId } });
    await prisma.homeless.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default smart mock implementations
    redisClient.get.mockImplementation(async (key) => {
      if (key.startsWith('revoked:')) return null; // Token not revoked
      if (key.startsWith('superadmin:jti:')) return null; // JTI not used
      return null;
    });
    
    redisClient.incr.mockImplementation(async (key) => {
      return 1; // Default count
    });
  });

  // Helper to create a fresh homeless record for each test that needs one
  const createTestHomeless = async () => {
    return await prisma.homeless.create({
      data: {
        lat: -31.4201,
        lng: -64.1888,
        apodo: `Test Subject ${Date.now()}`,
        organizationId: orgId,
        registradoPor: adminId,
      },
    });
  };

  describe('Double Secret Verification', () => {
    test('Access GRANTED with Primary Secret', async () => {
      const homeless = await createTestHomeless();
      
      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', `jti-primary-${Date.now()}`);

      if (res.status !== 200) console.error('Primary Secret Failed:', res.body);
      expect(res.status).toBe(200);
    });

    test('Access GRANTED with Backup Secret', async () => {
      const homeless = await createTestHomeless();
      
      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'backup-secret')
        .set('x-superadmin-jti', `jti-backup-${Date.now()}`);

      if (res.status !== 200) console.error('Backup Secret Failed:', res.body);
      expect(res.status).toBe(200);
    });

    test('Access DENIED with Incorrect Secret', async () => {
      const homeless = await createTestHomeless();
      
      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'wrong-secret')
        .set('x-superadmin-jti', `jti-wrong-${Date.now()}`);

      expect(res.status).toBe(403);
      
      // Cleanup since delete was denied
      await prisma.homeless.delete({ where: { id: homeless.id } });
    });
  });

  describe('Rate Limiting', () => {
    test('Access DENIED when Rate Limit Exceeded', async () => {
      const homeless = await createTestHomeless();
      
      redisClient.incr.mockImplementation(async (key) => {
        if (key.includes('superadmin:ratelimit')) return 4; // Exceed limit
        return 1;
      });

      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', `jti-rate-${Date.now()}`);

      if (res.status !== 403) console.error('Rate Limit Failed:', res.body);
      expect(res.status).toBe(403);
      
      // Cleanup
      await prisma.homeless.delete({ where: { id: homeless.id } });
    });
  });

  describe('JTI Replay Protection', () => {
    test('Access DENIED when JTI Reused', async () => {
      const homeless = await createTestHomeless();
      const reusedJti = `jti-reused-${Date.now()}`;
      
      redisClient.get.mockImplementation(async (key) => {
        if (key === `superadmin:jti:${reusedJti}`) return '1'; // JTI exists
        if (key.startsWith('revoked:')) return null;
        return null;
      });

      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', reusedJti);

      if (res.status !== 403) console.error('JTI Reused Failed:', res.body);
      expect(res.status).toBe(403);
      
      // Cleanup
      await prisma.homeless.delete({ where: { id: homeless.id } });
    });

    test('Access DENIED when JTI Missing', async () => {
      const homeless = await createTestHomeless();
      
      const res = await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret');
        // No JTI header

      if (res.status !== 403) console.error('JTI Missing Failed:', res.body);
      expect(res.status).toBe(403);
      
      // Cleanup
      await prisma.homeless.delete({ where: { id: homeless.id } });
    });
  });

  describe('Audit Logging', () => {
    test('Should create AuditLog entry on success', async () => {
      const homeless = await createTestHomeless();
      
      await request(app)
        .delete(`/api/homeless/${homeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'primary-secret')
        .set('x-superadmin-jti', `jti-audit-${Date.now()}`);

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
