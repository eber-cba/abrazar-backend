const statisticsService = require('../../src/modules/statistics/statistics.service');
const prisma = require('../../src/prismaClient');

// Mock Prisma
jest.mock('../../src/prismaClient', () => ({
  case: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  team: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  zone: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  emergency: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
}));

// Mock CacheService
jest.mock('../../src/services/cache.service', () => ({
  get: jest.fn().mockResolvedValue(null), // Default to cache miss
  set: jest.fn(),
  generateKey: jest.fn((prefix, id, suffix) => `${prefix}:${id}:${suffix}`),
}));

describe('StatisticsService', () => {
  const orgId = 'org-123';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverviewStats', () => {
    it('should return correct overview statistics', async () => {
      // Mock responses
      prisma.case.count
        .mockResolvedValueOnce(100) // totalCases
        .mockResolvedValueOnce(50)  // activeCases
        .mockResolvedValueOnce(40)  // resolvedCases
        .mockResolvedValueOnce(5);  // emergencyCases
      
      prisma.user.count.mockResolvedValueOnce(20);
      prisma.team.count.mockResolvedValueOnce(5);
      prisma.zone.count.mockResolvedValueOnce(3);
      
      prisma.case.groupBy.mockResolvedValueOnce([
        { status: 'REPORTED', _count: 30 },
        { status: 'RESOLVED', _count: 40 },
      ]);

      const result = await statisticsService.getOverviewStats(orgId);

      expect(result).toEqual({
        totalCases: 100,
        activeCases: 50,
        resolvedCases: 40,
        emergencyCases: 5,
        totalUsers: 20,
        totalTeams: 5,
        totalZones: 3,
        casesByStatus: [
          { status: 'REPORTED', count: 30 },
          { status: 'RESOLVED', count: 40 },
        ],
      });

      expect(prisma.case.count).toHaveBeenCalledTimes(4);
    });

    it('should return cached overview stats if available', async () => {
      const cachedStats = {
        totalCases: 100,
        activeCases: 50,
        // ... other fields
      };
      
      require('../../src/services/cache.service').get.mockResolvedValueOnce(cachedStats);

      const result = await statisticsService.getOverviewStats(orgId);

      expect(result).toEqual(cachedStats);
      expect(prisma.case.count).not.toHaveBeenCalled();
    });

    it('should cache results after fetching from db', async () => {
      require('../../src/services/cache.service').get.mockResolvedValueOnce(null);
      
      // Mock DB responses again for this test
      prisma.case.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(5);
      prisma.team.count.mockResolvedValue(2);
      prisma.zone.count.mockResolvedValue(1);
      prisma.case.groupBy.mockResolvedValue([]);

      await statisticsService.getOverviewStats(orgId);

      expect(require('../../src/services/cache.service').set).toHaveBeenCalled();
    });
  });

  describe('getCasesByStatus', () => {
    it('should return cases breakdown by status', async () => {
      prisma.case.groupBy.mockResolvedValueOnce([
        { status: 'REPORTED', _count: 10 },
        { status: 'VERIFIED', _count: 20 },
      ]);

      const result = await statisticsService.getCasesByStatus(orgId);

      expect(result.total).toBe(30);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toEqual({
        status: 'REPORTED',
        count: 10,
        percentage: '33.33',
      });
    });

    it('should filter by date range', async () => {
      prisma.case.groupBy.mockResolvedValueOnce([]);
      
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';
      
      await statisticsService.getCasesByStatus(orgId, { startDate, endDate });

      expect(prisma.case.groupBy).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      }));
    });
  });

  describe('getEmergencyStats', () => {
    it('should return emergency statistics', async () => {
      prisma.case.count.mockResolvedValueOnce(10); // totalEmergencies
      prisma.emergency.count
        .mockResolvedValueOnce(5)  // active
        .mockResolvedValueOnce(5); // resolved
      
      prisma.emergency.groupBy.mockResolvedValueOnce([
        { level: 5, _count: 3 },
        { level: 4, _count: 2 },
      ]);

      const result = await statisticsService.getEmergencyStats(orgId);

      expect(result).toEqual({
        totalEmergencies: 10,
        activeEmergencies: 5,
        resolvedEmergencies: 5,
        emergenciesByLevel: [
          { level: 5, count: 3 },
          { level: 4, count: 2 },
        ],
      });
    });
  });

  describe('getUserActivityStats', () => {
    it('should return user activity statistics', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          name: 'User 1',
          role: 'VOLUNTEER',
          _count: {
            createdCases: 5,
            assignedCases: 2,
            caseHistory: 10,
            comments: 3,
          },
        },
      ];

      prisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const result = await statisticsService.getUserActivityStats(orgId);

      expect(result.totalUsers).toBe(1);
      expect(result.userStats[0]).toEqual({
        userId: 'user-1',
        email: 'user1@test.com',
        name: 'User 1',
        role: 'VOLUNTEER',
        casesCreated: 5,
        casesAssigned: 2,
        actionsPerformed: 10,
        commentsAdded: 3,
      });
    });
  });
});
