const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, param, query, validationResult } = require('express-validator');

// Rate limiting configurations
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
const generalLimiter = createRateLimit(
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
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true' ? 1000 : 10, // Disable in dev or when env var is set
  'Too many file uploads, please try again later.'
);

// Chat message rate limiting
const chatLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true' ? 1000 : 30, // Disable in dev or when env var is set
  'Too many messages sent, please slow down.'
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.BACKEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input validation middleware
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
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  uuid: param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  
  tenantId: body('tenant_id')
    .optional()
    .isUUID()
    .withMessage('Invalid tenant ID format'),
  
  message: body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .escape(),
  
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

// Auth validation rules
const authValidations = {
  register: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.name,
    body('role')
      .optional()
      .isIn(['company_admin', 'agent', 'customer'])
      .withMessage('Invalid role'),
    validateRequest
  ],
  
  login: [
    commonValidations.email,
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validateRequest
  ],
  
  resetPassword: [
    commonValidations.email,
    validateRequest
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidations.password,
    validateRequest
  ]
};

// Company validation rules
const companyValidations = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    body('subdomain')
      .optional()
      .isAlphanumeric()
      .isLength({ min: 3, max: 30 })
      .withMessage('Subdomain must be 3-30 alphanumeric characters'),
    commonValidations.tenantId,
    validateRequest
  ],
  
  update: [
    commonValidations.uuid,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    body('status')
      .optional()
      .isIn(['active', 'suspended', 'deleted'])
      .withMessage('Invalid status'),
    validateRequest
  ]
};

// Chat validation rules
const chatValidations = {
  sendMessage: [
    commonValidations.message,
    body('chat_id')
      .isUUID()
      .withMessage('Invalid chat ID'),
    body('sender_type')
      .isIn(['customer', 'agent', 'ai', 'system'])
      .withMessage('Invalid sender type'),
    validateRequest
  ],
  
  createChat: [
    body('customer_name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    body('customer_email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    validateRequest
  ]
};

// File upload validation
const fileValidations = {
  upload: [
    body('filename')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Filename must be between 1 and 255 characters'),
    body('category')
      .optional()
      .isIn(['image', 'document', 'video', 'audio'])
      .withMessage('Invalid file category'),
    validateRequest
  ]
};

// SQL injection prevention middleware
const sqlInjectionPrevention = (req, res, next) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
    /(\bUNION\s+SELECT)/gi,
    /(\bDROP\s+TABLE)/gi,
    /(\bINSERT\s+INTO)/gi,
    /(\bUPDATE\s+\w+\s+SET)/gi,
    /(\bDELETE\s+FROM)/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) return true;
        } else if (checkValue(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

// XSS prevention middleware
const xssPrevention = (req, res, next) => {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      let sanitized = value;
      dangerousPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
      return sanitized;
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else {
          sanitized[key] = sanitizeValue(obj[key]);
        }
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      console.warn('HTTP Request:', logData);
    } else {
      console.log('HTTP Request:', logData);
    }
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let message = 'Internal server error';
  let statusCode = 500;
  
  if (err.name === 'ValidationError') {
    message = 'Validation failed';
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    message = 'Unauthorized';
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    message = 'Forbidden';
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    message = 'Resource not found';
    statusCode = 404;
  } else if (err.name === 'ConflictError') {
    message = 'Resource conflict';
    statusCode = 409;
  } else if (err.name === 'TooManyRequestsError') {
    message = 'Too many requests';
    statusCode = 429;
  }
  
  res.status(statusCode).json({
    success: false,
    message: isDevelopment ? err.message : message,
    ...(isDevelopment && { stack: err.stack })
  });
};

// Database indexing recommendations
const databaseIndexes = {
  // Users table
  users: [
    { fields: ['email'], unique: true },
    { fields: ['tenant_id', 'role'] },
    { fields: ['tenant_id', 'status'] },
    { fields: ['created_at'] }
  ],
  
  // Companies table
  companies: [
    { fields: ['subdomain'], unique: true },
    { fields: ['status'] },
    { fields: ['plan_id'] },
    { fields: ['created_at'] }
  ],
  
  // Chats table
  chats: [
    { fields: ['tenant_id', 'status'] },
    { fields: ['customer_id'] },
    { fields: ['agent_id'] },
    { fields: ['department_id'] },
    { fields: ['created_at'] },
    { fields: ['tenant_id', 'customer_id', 'status'] }
  ],
  
  // Messages table
  messages: [
    { fields: ['chat_id', 'created_at'] },
    { fields: ['sender_id'] },
    { fields: ['sender_type'] },
    { fields: ['created_at'] }
  ],
  
  // Tickets table
  tickets: [
    { fields: ['tenant_id', 'status'] },
    { fields: ['customer_id'] },
    { fields: ['agent_id'] },
    { fields: ['priority'] },
    { fields: ['created_at'] }
  ],
  
  // Notifications table
  notifications: [
    { fields: ['user_id', 'read'] },
    { fields: ['user_id', 'created_at'] },
    { fields: ['type'] }
  ]
};

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  uploadLimiter,
  chatLimiter,
  
  // Security middleware
  corsOptions,
  securityHeaders,
  sqlInjectionPrevention,
  xssPrevention,
  
  // Validation
  validateRequest,
  commonValidations,
  authValidations,
  companyValidations,
  chatValidations,
  fileValidations,
  
  // Logging and error handling
  requestLogger,
  errorHandler,
  
  // Database optimization
  databaseIndexes
};
