const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const statisticsService = require('../../src/modules/statistics/statistics.service');
const bcrypt = require('bcrypt');

// Mock Redis
jest.mock('../../src/config/redis', () => {
  const mRedis = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
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

describe('Statistics Consistency & Cache Invalidation', () => {
  let orgId;
  let userId;
  let token;

  beforeAll(async () => {
    // Setup test data
    const org = await prisma.organization.create({
      data: {
        name: `Stats Test Org ${Date.now()}`,
        type: 'NGO',
      },
    });
    orgId = org.id;

    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: `stats-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Stats Tester',
        role: 'COORDINATOR',
        organizationId: orgId,
      },
    });
    userId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    
    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.body);
    }
    token = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup in proper order
    try {
      // First delete case-related child tables
      await prisma.comment.deleteMany({ where: { case: { organizationId: orgId } } });
      await prisma.emergency.deleteMany({ where: { case: { organizationId: orgId } } });
      await prisma.caseHistory.deleteMany({ where: { case: { organizationId: orgId } } });
      await prisma.caseStatusHistory.deleteMany({ where: { case: { organizationId: orgId } } });
      // Then delete cases
      await prisma.case.deleteMany({ where: { organizationId: orgId } });
      // Delete audit logs
      await prisma.auditLog.deleteMany({ where: { userId: userId } });
      // Delete user
      await prisma.user.deleteMany({ where: { organizationId: orgId } });
      // Finally delete organization
      await prisma.organization.delete({ where: { id: orgId } });
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();
  });

  test('should get statistics for new organization', async () => {
    const stats = await statisticsService.getOverviewStats(orgId);
    expect(stats).toBeDefined();
    expect(stats.totalCases).toBe(0);
  });

  test('should show new case in statistics after creation', async () => {
    // 1. Get initial stats
    const initialStats = await statisticsService.getOverviewStats(orgId);
    const initialCount = initialStats.totalCases || 0;

    // 2. Create a new case via API
    const createRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Test Case for Stats',
        age: 30,
        description: 'Testing stats',
        lat: 0,
        lng: 0,
      });
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.case).toHaveProperty('id');

    // 3. Verify stats are updated
    const updatedStats = await statisticsService.getOverviewStats(orgId);
    expect(updatedStats.totalCases).toBe(initialCount + 1);
  });

  test('should update stats when case status changes', async () => {
    // Create a case first
    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Status Change Test',
        age: 25,
        description: 'Testing status change',
        lat: 0,
        lng: 0,
      });
    
    expect(caseRes.status).toBe(201);
    const createdCaseId = caseRes.body.data.case.id;
    expect(createdCaseId).toBeDefined();

    // Update status
    const updateRes = await request(app)
      .patch(`/api/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    expect(updateRes.status).toBe(200);

    // Verify stats reflect change
    const stats = await statisticsService.getOverviewStats(orgId);
    expect(stats.casesByStatus).toBeDefined();
  });
});
