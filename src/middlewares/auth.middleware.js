const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const AppError = require('../utils/errors');
const env = require('../config/env');

const sessionService = require('../modules/sessions/session.service');

/**
 * Middleware to protect routes.
 * Verifies JWT token and checks if user exists and token is not revoked.
 * Attaches user object to request.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    // Check if token is revoked
    const isRevoked = await sessionService.isTokenRevoked(token);
    if (isRevoked) {
      return next(new AppError('Token revoked. Please log in again.', 401));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token does no longer exist.', 401)
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    req.token = token; // Pass token to controller if needed
    next();
  } catch (err) {
    return next(new AppError('Invalid token', 401));
  }
};

/**
 * Middleware to optionally protect routes.
 * If token is present and valid, attaches user to request.
 * If not, proceeds without user (guest access).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!currentUser) {
      return next();
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    // If token is invalid, just proceed without user
    return next();
  }
};

module.exports = { protect, optionalProtect };
