/**
 * Rate Limiting Middleware
 * Different rate limits based on user roles
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter (stricter)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Emergency endpoints rate limiter (more lenient)
 */
const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for emergency endpoints
  message: {
    status: 'fail',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Statistics endpoints rate limiter
 */
const statisticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Moderate limit for statistics
  message: {
    status: 'fail',
    message: 'Too many statistics requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Role-based rate limiter
 * Adjusts limits based on user role
 */
const roleBasedLimiterFactory = (baseMax = 100) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: async (req) => {
      if (!req.user) return baseMax;

      // Higher limits for organization admins and coordinators
      if (['ADMIN', 'ORGANIZATION_ADMIN', 'COORDINATOR'].includes(req.user.role)) {
        return baseMax * 3;
      }

      // Moderate limits for social workers and data analysts
      if (['SOCIAL_WORKER', 'DATA_ANALYST'].includes(req.user.role)) {
        return baseMax * 2;
      }

      // Base limit for volunteers and public users
      return baseMax;
    },
    message: {
      status: 'fail',
      message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  emergencyLimiter,
  statisticsLimiter,
  roleBasedLimiterFactory,
};
