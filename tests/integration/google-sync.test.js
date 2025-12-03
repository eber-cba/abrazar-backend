const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

describe('Google Places Sync Integration', () => {
  let adminToken, coordinatorToken, volunteerToken;
  let organizationId;
  let adminUserId;

  beforeAll(async () => {
    // Clean up any existing test data first
    await prisma.servicePoint.deleteMany({ where: { name: { contains: 'Sync Test' } } });
    await prisma.user.deleteMany({ where: { email: { in: ['admin@sync.com', 'coord@sync.com', 'vol@sync.com'] } } });
    await prisma.organization.deleteMany({ where: { name: 'Sync Test Org' } });

    // 1. Create Organization
    const org = await prisma.organization.create({
      data: {
        name: 'Sync Test Org',
        type: 'NGO',
        contactPhone: '1234567890',
        contactEmail: 'sync@test.org',
      },
    });
    organizationId = org.id;

    // 2. Create Users
    const admin = await prisma.user.create({
      data: {
        email: 'admin@sync.com',
        password: 'hashedpassword',
        name: 'Admin User',
        role: 'ORGANIZATION_ADMIN',
        organizationId: org.id,
      },
    });
    adminUserId = admin.id;
    adminToken = jwt.sign({ id: admin.id }, env.JWT_SECRET);

    const coordinator = await prisma.user.create({
      data: {
        email: 'coord@sync.com',
        password: 'hashedpassword',
        name: 'Coordinator User',
        role: 'COORDINATOR',
        organizationId: org.id,
      },
    });
    coordinatorToken = jwt.sign({ id: coordinator.id }, env.JWT_SECRET);

    const volunteer = await prisma.user.create({
      data: {
        email: 'vol@sync.com',
        password: 'hashedpassword',
        name: 'Volunteer User',
        role: 'VOLUNTEER',
        organizationId: org.id,
      },
    });
    volunteerToken = jwt.sign({ id: volunteer.id }, env.JWT_SECRET);
  });

  afterAll(async () => {
    // Clean up in correct order to avoid foreign key constraints
    await prisma.servicePoint.deleteMany({ where: { organizationId } });
    await prisma.auditLog.deleteMany({ where: { user: { organizationId } } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear service points before each test
    await prisma.servicePoint.deleteMany({ where: { organizationId } });
  });

  describe('POST /api/service-points/sync-google', () => {
    it('should allow ORGANIZATION_ADMIN to sync', async () => {
      const res = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'hospital',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.count).toBeGreaterThan(0);
      expect(res.body.data.points).toBeInstanceOf(Array);
      expect(res.body.data.points[0]).toHaveProperty('id');
      expect(res.body.data.points[0].type).toBe('HEALTH_CENTER'); // Mapped type
    });

    it('should allow COORDINATOR to sync', async () => {
      const res = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'lodging',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should deny VOLUNTEER from syncing', async () => {
      const res = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'hospital',
        });

      expect(res.status).toBe(403);
    });

    it('should create service points in database', async () => {
      await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'hospital',
        });

      const points = await prisma.servicePoint.findMany({
        where: { organizationId },
      });

      expect(points.length).toBeGreaterThan(0);
      expect(points[0].servicesOffered).toHaveProperty('googlePlaceId');
    });

    it('should not duplicate existing points', async () => {
      // First sync
      const res1 = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'hospital',
        });

      const count1 = res1.body.data.count;

      // Second sync (same params)
      const res2 = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: -34.6037,
          longitude: -58.3816,
          radius: 1000,
          type: 'hospital',
        });

      const count2 = res2.body.data.count;

      expect(count1).toBeGreaterThan(0);
      expect(count2).toBe(0); // Should not create duplicates
    });

    it('should validate input parameters', async () => {
      const res = await request(app)
        .post('/api/service-points/sync-google')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: 200, // Invalid lat
          longitude: -58.3816,
          type: 'hospital',
        });

      expect(res.status).toBe(400);
    });
  });
});
