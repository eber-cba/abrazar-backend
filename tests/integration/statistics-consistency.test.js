const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/prismaClient');
const { redisClient } = require('../../src/config/redis');
const cacheService = require('../../src/services/cache.service');
const statisticsService = require('../../src/modules/statistics/statistics.service');
const bcrypt = require('bcrypt');

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Statistics Consistency & Cache Invalidation', () => {
  let orgId;
  let userId;
  let token;
  let caseId;

  beforeAll(async () => {
    // Setup test data
    const org = await prisma.organization.create({
      data: {
        name: 'Stats Test Org',
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
  });

  beforeEach(async () => {
    // Clear cache
    await statisticsService.invalidateStatsCache(orgId);
  });

  test('should invalidate cache when a new case is created', async () => {
    // 1. Get stats (should be calculated and cached)
    const initialStats = await statisticsService.getOverviewStats(orgId);
    const initialCount = initialStats.totalCases;

    // Verify it's in cache
    const cacheKey = cacheService.generateKey('stats', orgId, 'overview');
    const cachedBefore = await cacheService.get(cacheKey);
    expect(cachedBefore).toBeDefined();

    // 2. Create a new case via API
    const createRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Test Case for Stats',
        age: 30,
        description: 'Testing stats invalidation',
        lat: 0,
        lng: 0,
      });
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.case).toHaveProperty('id');

    // 3. Verify cache is invalidated and stats are updated
    const updatedStats = await statisticsService.getOverviewStats(orgId);
    expect(updatedStats.totalCases).toBe(initialCount + 1);
  });

  test('should invalidate cache when case status changes', async () => {
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
    
    // Extract caseId from response
    const createdCaseId = caseRes.body.data.case.id;
    expect(createdCaseId).toBeDefined();

    // Get stats to cache them
    await statisticsService.getOverviewStats(orgId);

    // Update status
    await request(app)
      .patch(`/api/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    // Verify stats reflect change
    const stats = await statisticsService.getOverviewStats(orgId);
    const verifiedCases = stats.casesByStatus.find(s => s.status === 'VERIFIED');
    expect(verifiedCases).toBeDefined();
    expect(verifiedCases.count).toBeGreaterThan(0);
  });
});
