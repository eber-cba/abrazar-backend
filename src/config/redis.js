const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, { 
  maxRetriesPerRequest: null,
  // Railway often requires family: 6 for internal networks or specific TLS settings
  // We can try to detect if it's a rediss:// url for TLS
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

const redisSubscriber = new Redis(redisUrl, { 
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

redisClient.on('connect', () => {
  // Mask password for logging
  const maskedUrl = redisUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`✅ Redis client connected to ${maskedUrl}`);
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

module.exports = {
  redisClient,
  redisSubscriber,
};
