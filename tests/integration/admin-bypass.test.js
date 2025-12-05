const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const bcrypt = require('bcrypt');

// Mock Env Module
jest.mock('../../src/config/env', () => ({
  SUPERADMIN_SECRET: 'test-super-secret',
  SUPERADMIN_SECRET_BACKUP: 'test-backup-secret',
  SUPERADMIN_RATE_LIMIT: 10,
  SUPERADMIN_JTI_ENABLED: false, // Disable JTI for simpler tests
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PORT: 3000,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5434/abrazar_prod',
}));

// Mock Redis
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    status: 'ready',
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn((channel, cb) => cb && cb(null, 1)),
  };
  return { 
    redisClient: mRedis,
    redisSubscriber: { ...mRedis }
  };
});

describe('Secure SuperAdmin Mode - Integration Tests', () => {
  let adminToken;
  let adminId;
  let orgId;
  let homelessId;

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: `SuperAdmin Test Org ${Date.now()}`,
        type: 'NGO',
      },
    });
    orgId = org.id;

    // Create ADMIN user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `super-admin-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Super Admin Candidate',
        role: 'ADMIN',
        organizationId: orgId, 
      },
    });
    adminId = admin.id;

    // Login ADMIN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' });
    
    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.body);
    }
    adminToken = loginRes.body.token;

    // Create a homeless record in the organization
    const homeless = await prisma.homeless.create({
      data: {
        lat: -31.4201,
        lng: -64.1888,
        apodo: 'Test Subject',
        organizationId: orgId,
        registradoPor: adminId,
      },
    });
    homelessId = homeless.id;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.auditLog.deleteMany({ where: { userId: adminId } });
      await prisma.homeless.deleteMany({ where: { organizationId: orgId } });
      await prisma.user.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.delete({ where: { id: orgId } });
    } catch (e) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('Permission Bypass Security', () => {
    test('ADMIN WITHOUT secret header should be DENIED access to restricted route', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    test('ADMIN WITH INCORRECT secret header should be DENIED access', async () => {
      const res = await request(app)
        .delete(`/api/homeless/${homelessId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'wrong-secret');

      expect(res.status).toBe(403);
    });

    test('ADMIN WITH CORRECT secret header should be GRANTED access', async () => {
      // Create a new record to delete
      const newHomeless = await prisma.homeless.create({
        data: {
          lat: -31.4201,
          lng: -64.1888,
          apodo: 'To Delete',
          organizationId: orgId,
          registradoPor: adminId,
        },
      });

      const res = await request(app)
        .delete(`/api/homeless/${newHomeless.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'test-super-secret');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Multi-Tenancy Bypass Security', () => {
    let otherOrgId;
    let otherHomelessId;

    beforeAll(async () => {
      // Create another organization
      const otherOrg = await prisma.organization.create({
        data: { name: `Other Org Secure ${Date.now()}`, type: 'MUNICIPALITY' },
      });
      otherOrgId = otherOrg.id;

      // Create homeless in that other org
      const homeless = await prisma.homeless.create({
        data: {
          lat: -32.0000,
          lng: -65.0000,
          apodo: 'Other Org Subject Secure',
          organizationId: otherOrgId,
          registradoPor: adminId, 
        },
      });
      otherHomelessId = homeless.id;
    });

    afterAll(async () => {
      try {
        await prisma.homeless.deleteMany({ where: { organizationId: otherOrgId } });
        await prisma.organization.delete({ where: { id: otherOrgId } });
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    test('ADMIN WITHOUT secret header should NOT see other org data', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should be 200 with filtered data
      if (res.status !== 200) {
        console.error('GET homeless failed:', res.body);
      }
      expect(res.status).toBe(200);
      // Should NOT find the record from the other organization
      const found = res.body.data.homeless.find(h => h.id === otherHomelessId);
      expect(found).toBeUndefined();
    });

    test('ADMIN WITH CORRECT secret header SHOULD see other org data', async () => {
      const res = await request(app)
        .get('/api/homeless')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-superadmin-secret', 'test-super-secret');

      expect(res.status).toBe(200);
      // Should find the record from the other organization
      const found = res.body.data.homeless.find(h => h.id === otherHomelessId);
      expect(found).toBeDefined();
    });
  });
});
