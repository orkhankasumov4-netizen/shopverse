const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, errors } = err;

  // PostgreSQL errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Resource already exists';
    const field = err.detail?.match(/\((.+?)\)/)?.[1];
    if (field) message = `${field} already exists`;
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced resource not found';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (statusCode >= 500) {
    logger.error('Server error', { error: err.message, stack: err.stack, path: req.path });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, errorHandler, notFound, asyncHandler };
