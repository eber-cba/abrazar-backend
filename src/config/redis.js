const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
const redisSubscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

module.exports = {
  redisClient,
  redisSubscriber,
};
