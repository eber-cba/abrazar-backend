const cacheService = require('../../src/services/cache.service');
const { redisClient } = require('../../src/config/redis');

// Mock Redis client
jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
}));

describe('CacheService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed value if exists', async () => {
      const mockData = { foo: 'bar' };
      redisClient.get.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await cacheService.get('test-key');
      expect(result).toEqual(mockData);
      expect(redisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if not exists', async () => {
      redisClient.get.mockResolvedValueOnce(null);

      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      redisClient.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const mockData = { foo: 'bar' };
      await cacheService.set('test-key', mockData);

      expect(redisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(mockData),
        'EX',
        300
      );
    });

    it('should set value with custom TTL', async () => {
      const mockData = { foo: 'bar' };
      await cacheService.set('test-key', mockData, 60);

      expect(redisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(mockData),
        'EX',
        60
      );
    });

    it('should handle errors gracefully', async () => {
      redisClient.set.mockRejectedValueOnce(new Error('Redis error'));
      await cacheService.set('test-key', 'value');
      // Should not throw
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await cacheService.del('test-key');
      expect(redisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('delByPattern', () => {
    it('should delete keys matching pattern', async () => {
      redisClient.keys.mockResolvedValueOnce(['key1', 'key2']);
      
      await cacheService.delByPattern('test:*');
      
      expect(redisClient.keys).toHaveBeenCalledWith('test:*');
      expect(redisClient.del).toHaveBeenCalledWith(['key1', 'key2']);
    });

    it('should do nothing if no keys match', async () => {
      redisClient.keys.mockResolvedValueOnce([]);
      
      await cacheService.delByPattern('test:*');
      
      expect(redisClient.keys).toHaveBeenCalledWith('test:*');
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});
