const logger = require('../config/logger');
const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Zod Validation Error
  if (err instanceof ZodError || err.name === 'ZodError') {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation Error',
      errors: err.errors,
    });
  }

  // Log the error
  logger.error(`${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Prisma Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'fail',
        message: 'Duplicate field value entered',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'fail',
        message: 'Record not found',
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid data provided to database',
      details: err.message // Optional: include for debugging
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again!',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your token has expired! Please log in again.',
    });
  }

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!',
  });
};

module.exports = errorHandler;
