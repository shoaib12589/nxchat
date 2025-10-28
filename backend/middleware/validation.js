const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  // Skip rate limiting in development or when DISABLE_RATE_LIMITING is true
  if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true') {
    return (req, res, next) => {
      next();
    };
  }

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limiting
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true' ? 10000 : 100, // Disable in dev or when env var is set
  'Too many requests from this IP, please try again later.'
);

// Auth endpoints rate limiting
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true' ? 10000 : 5, // Disable in dev or when env var is set
  'Too many authentication attempts, please try again later.'
);

// File upload rate limiting
const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true' ? 1000 : 10, // Disable in dev or when env var is set
  'Too many file uploads, please try again later.'
);

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateEmail = () => body('email').isEmail().normalizeEmail();
const validatePassword = () => body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
const validateName = () => body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters');
const validateId = (paramName = 'id') => param(paramName).isInt().withMessage('Invalid ID');
const validateTenantId = () => param('tenantId').isInt().withMessage('Invalid tenant ID');

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      field: err.errors[0].path
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

// Not found middleware
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  validateRequest,
  validateEmail,
  validatePassword,
  validateName,
  validateId,
  validateTenantId,
  sanitizeInput,
  errorHandler,
  notFound
};
