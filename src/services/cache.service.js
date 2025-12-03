const { redisClient } = require('../config/redis');

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default 300s = 5m)
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = 300) {
    try {
      const data = JSON.stringify(value);
      if (ttl) {
        await redisClient.set(key, data, 'EX', ttl);
      } else {
        await redisClient.set(key, data);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Delete values by pattern
   * @param {string} pattern - Key pattern (e.g., "stats:*")
   * @returns {Promise<void>}
   */
  async delByPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`Cache delByPattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Generate a standardized key
   * @param {string} prefix - Key prefix (e.g., "stats")
   * @param {string} identifier - Unique identifier (e.g., orgId)
   * @param {string} suffix - Optional suffix (e.g., "overview")
   * @returns {string} Formatted key
   */
  generateKey(prefix, identifier, suffix = '') {
    return `${prefix}:${identifier}${suffix ? `:${suffix}` : ''}`;
  }
}

module.exports = new CacheService();
