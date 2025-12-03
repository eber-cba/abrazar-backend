const statisticsService = require('../../src/modules/statistics/statistics.service');
const cacheService = require('../../src/services/cache.service');
const prisma = require('../../src/prismaClient');

// Mock dependencies
jest.mock('../../src/services/cache.service');
jest.mock('../../src/prismaClient', () => ({
  case: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  user: { count: jest.fn() },
  team: { count: jest.fn() },
  zone: { count: jest.fn() },
}));
jest.mock('../../src/queues', () => ({
  addStatsJob: jest.fn(),
}));

describe('Statistics Performance', () => {
  const orgId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return cached data immediately if available', async () => {
    const cachedData = { totalCases: 100, activeCases: 50 };
    cacheService.get.mockResolvedValue(cachedData);
    cacheService.generateKey.mockReturnValue('stats:org-123:overview');

    const start = Date.now();
    const result = await statisticsService.getOverviewStats(orgId);
    const duration = Date.now() - start;

    expect(result).toEqual(cachedData);
    expect(cacheService.get).toHaveBeenCalled();
    expect(prisma.case.count).not.toHaveBeenCalled();
    expect(duration).toBeLessThan(50); // Should be very fast
  });

  test('should calculate and cache if not in cache', async () => {
    cacheService.get.mockResolvedValue(null);
    cacheService.generateKey.mockReturnValue('stats:org-123:overview');
    
    // Mock DB responses
    prisma.case.count.mockResolvedValue(10);
    prisma.user.count.mockResolvedValue(5);
    prisma.team.count.mockResolvedValue(2);
    prisma.zone.count.mockResolvedValue(3);
    prisma.case.groupBy.mockResolvedValue([]);

    const result = await statisticsService.getOverviewStats(orgId);

    expect(prisma.case.count).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith(
      'stats:org-123:overview',
      expect.any(Object),
      1800
    );
  });
});
