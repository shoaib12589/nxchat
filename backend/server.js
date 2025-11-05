const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cookieParser = require('cookie-parser');
require('./config/env-loader'); // Load from root .env file

const { sequelize, testConnection } = require('./config/database');
const { errorHandler, notFound, apiLimiter } = require('./middleware/validation');

// Import models to establish relationships
require('./models');

// Import socket handlers
const chatSocket = require('./sockets/chatSocket');
const callSocket = require('./sockets/callSocket');
const { notificationSocket } = require('./sockets/notificationSocket');

// Import Redis Pub/Sub service for multi-instance support
const redisPubSubService = require('./services/redisPubSubService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const superAdminRoutes = require('./routes/superadmin');
const companyRoutes = require('./routes/company');
const agentRoutes = require('./routes/agent');
const widgetRoutes = require('./routes/widget');
const stripeRoutes = require('./routes/stripe');
const aiTrainingRoutes = require('./routes/ai-training');
const systemStatusRoutes = require('./routes/system-status');
const brandRoutes = require('./routes/brands');
const emailTemplateRoutes = require('./routes/emailTemplates');
const uploadRoutes = require('./routes/uploads');

// Import trigger service
const triggerService = require('./services/triggerService');

const app = express();
const server = http.createServer(app);

// Socket.io setup with performance optimizations
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for widget compatibility
    methods: ["GET", "POST"],
    credentials: false
  },
  // Performance optimizations
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowEIO3: true,
  // Connection management
  maxHttpBufferSize: 1e6, // 1MB
  // Compression
  compression: true,
  // Memory optimization
  serveClient: true, // Enable serving client files for widget compatibility
  // Engine.io optimizations
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
});

// Initialize Redis Pub/Sub adapter for multi-instance Socket.io support
redisPubSubService.initialize(io).then(initialized => {
  if (initialized) {
    console.log('✅ Redis Pub/Sub adapter initialized');
  } else {
    console.log('⚠️ Redis Pub/Sub not available - running in single-instance mode');
  }
});

// Compression middleware (should be early in the stack)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security middleware - Disabled for widget compatibility
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false
}));

// CORS configuration - Allow all origins for widget functionality
app.use(cors({
  origin: '*', // Allow all origins
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Body parsing middleware with optimized limits
app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 1000
}));
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// Static files for widget with CORS headers
app.use('/widget', (req, res, next) => {
  // Set CORS headers for widget static files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../chat-widget')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'NxChat API is running',
    timestamp: new Date().toISOString()
  });
});




// Import maintenance mode middleware
const { checkMaintenanceMode } = require('./middleware/maintenanceMode');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', checkMaintenanceMode, userRoutes);
app.use('/api/superadmin', superAdminRoutes); // Super admin routes don't need maintenance check
app.use('/api/company', checkMaintenanceMode, companyRoutes);
app.use('/api/agent', checkMaintenanceMode, agentRoutes);
app.use('/api/widget', checkMaintenanceMode, widgetRoutes);
app.use('/api/stripe', checkMaintenanceMode, stripeRoutes);
app.use('/api/ai-training', checkMaintenanceMode, aiTrainingRoutes);
app.use('/api/system-status', systemStatusRoutes); // System status routes don't need maintenance check
app.use('/api/brands', checkMaintenanceMode, brandRoutes);
app.use('/api/email-templates', checkMaintenanceMode, emailTemplateRoutes);
app.use('/api/uploads', checkMaintenanceMode, uploadRoutes);

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Widget JavaScript file route with CORS headers
app.get('/widget/nxchat-widget.js', (req, res) => {
  // Set CORS headers specifically for the widget JS file
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', 'application/javascript');
  
  // Serve the widget file
  res.sendFile(path.join(__dirname, 'public/nxchat-widget.js'));
});

// Widget routes
app.use('/widget', widgetRoutes);

// Make io instance available to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize chat socket handlers for all connections (including widget)
  chatSocket(io, socket);

  // Centralized authentication handler
  socket.on('authenticate', async (data) => {
    try {
      console.log('=== CENTRALIZED SOCKET AUTHENTICATION START ===');
      console.log('Received authentication request:', { 
        hasToken: !!data.token, 
        tokenLength: data.token?.length,
        tokenStart: data.token?.substring(0, 20) + '...'
      });
      
      const { token } = data;
      if (!token) {
        console.log('❌ No token provided in authentication request');
        socket.emit('auth_error', { message: 'No token provided' });
        return;
      }
      
      const jwt = require('jsonwebtoken');
      const { User, Company } = require('./models');
      
      console.log('🔍 Attempting JWT verification...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', { 
        userId: decoded.userId, 
        role: decoded.role,
        tenantId: decoded.tenantId,
        exp: decoded.exp,
        iat: decoded.iat
      });
      
      // Verify the decoded token has required fields
      if (!decoded.userId) {
        console.log('Token missing userId field');
        socket.emit('auth_error', { message: 'Token missing userId field' });
        return;
      }
      
      if (!decoded.role) {
        console.log('Token missing role field');
        socket.emit('auth_error', { message: 'Token missing role field' });
        return;
      }
      
      // tenantId is optional for super admins
      if (!decoded.tenantId && decoded.role !== 'super_admin') {
        console.log('Token missing tenantId field (required for non-superadmin users)');
        socket.emit('auth_error', { message: 'Token missing tenantId field' });
        return;
      }
      
      console.log('🔍 Looking up user in database...');
      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Company, as: 'company' }]
      });

      console.log('User lookup result:', user ? 'User found' : 'User not found');
      if (!user) {
        console.log('❌ User not found for ID:', decoded.userId);
        socket.emit('auth_error', { message: 'User not found' });
        return;
      }
      
      if (user.status !== 'active') {
        console.log('❌ User status is not active:', user.status);
        socket.emit('auth_error', { message: 'User account is not active' });
        return;
      }

      console.log('✅ User validation passed');
      
      // Set socket properties
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.tenantId = user.tenant_id;
      socket.currentUser = user;

      // Join user-specific room
      socket.join(`user_${user.id}`);
      
      // Join tenant room if applicable (not required for super admins)
      if (user.tenant_id) {
        socket.join(`tenant_${user.tenant_id}`);
        console.log(`User joined tenant room: tenant_${user.tenant_id}`);
      } else if (user.role === 'super_admin') {
        console.log(`Super admin ${user.name} connected (no tenant room needed)`);
      } else {
        console.log(`User ${user.name} has no tenant_id but is not a super admin`);
      }

      // For agents: Join brand-specific rooms for filtered visitor events
      if (user.role === 'agent' && user.tenant_id) {
        const { BrandAgent } = require('./models');
        const assignedBrands = await BrandAgent.findAll({
          where: {
            agent_id: user.id,
            status: 'active'
          },
          attributes: ['brand_id']
        });

        assignedBrands.forEach(brandAgent => {
          socket.join(`brand_${brandAgent.brand_id}`);
          console.log(`Agent ${user.name} joined brand room: brand_${brandAgent.brand_id}`);
        });
      }

    socket.emit('authenticated', { 
      success: true, 
      user: user.toJSON() 
    });

    console.log(`✅ User ${user.name} (${user.role}) authenticated successfully`);
    console.log('=== CENTRALIZED SOCKET AUTHENTICATION COMPLETE ===');
    
    // Track user presence in Redis
    if (redisPubSubService) {
      redisPubSubService.setUserPresence(user.id, user.tenant_id, user.role);
    }
      
      // Send unread notifications
      try {
        const { Notification } = require('./models');
        const unreadNotifications = await Notification.findAll({
          where: {
            user_id: user.id,
            read: false
          },
          order: [['created_at', 'DESC']],
          limit: 10
        });

        socket.emit('notifications_loaded', {
          notifications: unreadNotifications
        });
        console.log(`Sent ${unreadNotifications.length} unread notifications to user ${user.name}`);
      } catch (notificationError) {
        console.error('Error loading notifications:', notificationError);
      }
      
      // Initialize authenticated socket handlers after authentication
      callSocket(io, socket);
      notificationSocket(io, socket);
      
    } catch (error) {
      console.log('=== CENTRALIZED SOCKET AUTHENTICATION ERROR ===');
      console.error('Socket authentication error:', error);
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('Full error object:', JSON.stringify(error, null, 2));
      
      // Provide specific error messages based on error type
      if (error.name === 'JsonWebTokenError') {
        console.log('❌ JWT token is malformed or invalid');
        socket.emit('auth_error', { 
          message: 'Invalid token format', 
          details: error.message,
          errorType: 'JsonWebTokenError'
        });
      } else if (error.name === 'TokenExpiredError') {
        console.log('❌ JWT token has expired');
        socket.emit('auth_error', { 
          message: 'Token has expired', 
          details: error.message,
          errorType: 'TokenExpiredError'
        });
      } else if (error.name === 'NotBeforeError') {
        console.log('❌ JWT token is not active yet');
        socket.emit('auth_error', { 
          message: 'Token not active yet', 
          details: error.message,
          errorType: 'NotBeforeError'
        });
      } else {
        console.log('❌ Other JWT error:', error.message);
        socket.emit('auth_error', { 
          message: 'Authentication failed', 
          error: error.message, 
          details: error.stack,
          errorType: error.name || 'UnknownError'
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Update presence tracking on disconnect
    if (socket.currentUser && redisPubSubService) {
      // Presence TTL will expire automatically after 30s
      console.log(`User ${socket.currentUser.name} disconnected`);
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database sync and server start
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ Database synchronized successfully');

    // Setup database with dummy data if needed
    await setupDatabase();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 NxChat server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.io server ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Setup database with dummy data
const setupDatabase = async () => {
  try {
    const { User } = require('./models');
    
    const existingSuperAdmin = await User.findOne({
      where: { role: 'super_admin' }
    });

    if (!existingSuperAdmin) {
      console.log('🔄 No super admin found. Please run the migration script first:');
      console.log('   node migrate-database.js');
      console.log('✅ Database tables are ready, but no seed data found');
    } else {
      console.log('✅ Database already initialized with seed data');
    }
  } catch (error) {
    console.error('❌ Error checking database setup:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
