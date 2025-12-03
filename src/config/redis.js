const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis clients with optional connection
const redisClient = new Redis(redisUrl, { 
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('⚠️ Redis connection failed after 3 attempts. Running without Redis.');
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

const redisSubscriber = new Redis(redisUrl, { 
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

// Try to connect, but don't crash if it fails
redisClient.connect().catch((err) => {
  console.warn('⚠️ Redis connection failed. Running without Redis. Queues will be disabled.');
  console.warn('Error:', err.message);
});

redisSubscriber.connect().catch((err) => {
  console.warn('⚠️ Redis subscriber connection failed.');
});

redisClient.on('connect', () => {
  const maskedUrl = redisUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`✅ Redis client connected to ${maskedUrl}`);
});

redisClient.on('error', (err) => {
  // Suppress repetitive timeout errors
  if (!err.message.includes('ETIMEDOUT')) {
    console.error('Redis client error:', err.message);
  }
});

module.exports = {
  redisClient,
  redisSubscriber,
};
