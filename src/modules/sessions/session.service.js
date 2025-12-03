const { PrismaClient } = require('@prisma/client');
const { redisClient } = require('../../config/redis');
const env = require('../../config/env');

const prisma = new PrismaClient();

const SESSION_PREFIX = 'session:';
const REVOKED_TOKEN_PREFIX = 'revoked:';

class SessionService {
  /**
   * Create a new session in Redis and DB
   */
  async createSession(userId, token, deviceInfo, ipAddress) {
    // 1. Store in DB for audit/history
    const session = await prisma.userSession.create({
      data: {
        userId,
        token,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + this.parseDuration(env.JWT_EXPIRES_IN)),
      },
    });

    // 2. Store in Redis for fast access (optional, mainly for listing active sessions quickly)
    // We can store a list of session IDs for the user
    await redisClient.sadd(`user_sessions:${userId}`, session.id);
    
    // Store session details
    await redisClient.set(
      `${SESSION_PREFIX}${session.id}`,
      JSON.stringify({
        userId,
        token,
        deviceInfo,
        ipAddress,
        createdAt: session.createdAt,
      }),
      'EX',
      this.parseDurationSeconds(env.JWT_EXPIRES_IN)
    );

    return session;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId, userId) {
    // 1. Remove from Redis
    await redisClient.del(`${SESSION_PREFIX}${sessionId}`);
    await redisClient.srem(`user_sessions:${userId}`, sessionId);

    // 2. Mark as invalid in DB
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isValid: false },
    });

    // 3. If we want to blacklist the token associated with this session
    const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
    if (session) {
      await this.revokeToken(session.token, userId, 'Session revoked by user');
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId) {
    const sessionIds = await redisClient.smembers(`user_sessions:${userId}`);
    
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId, userId);
    }
    
    // Also mark all DB sessions as invalid
    await prisma.userSession.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false },
    });
  }

  /**
   * Add token to revocation blacklist (Redis)
   */
  async revokeToken(token, userId, reason = 'Logout') {
    // Store in Redis with expiry matching token expiry
    // Assuming 7 days for now if not parsed from token
    const ttl = this.parseDurationSeconds(env.JWT_EXPIRES_IN);
    
    await redisClient.set(
      `${REVOKED_TOKEN_PREFIX}${token}`,
      JSON.stringify({ userId, reason, revokedAt: new Date() }),
      'EX',
      ttl
    );

    // Store in DB
    await prisma.revokedToken.create({
      data: {
        token,
        userId,
        reason,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
  }

  /**
   * Check if a token is revoked
   */
  async isTokenRevoked(token) {
    const isRevoked = await redisClient.get(`${REVOKED_TOKEN_PREFIX}${token}`);
    return !!isRevoked;
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    // Fetch from DB as it's reliable source of truth for "list"
    // Redis is for fast revocation checks
    return await prisma.userSession.findMany({
      where: { userId, isValid: true },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  // Helper to parse "7d", "1h" etc to ms
  parseDuration(duration) {
    if (!duration) return 7 * 24 * 60 * 60 * 1000; // Default 7d
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  parseDurationSeconds(duration) {
    return Math.floor(this.parseDuration(duration) / 1000);
  }
}

module.exports = new SessionService();
