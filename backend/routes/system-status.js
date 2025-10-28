const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { sequelize } = require('../config/database');

// Try to load Redis, but don't fail if it's not available
let redis = null;
try {
  const redisConfig = require('../config/redis');
  redis = redisConfig.redis;
} catch (error) {
  console.warn('Redis not available:', error.message);
}

// Function to reload Redis configuration
async function reloadRedisConfig() {
  try {
    const redisConfig = require('../config/redis');
    await redisConfig.loadRedisConfig();
    redis = redisConfig.redis;
  } catch (error) {
    console.warn('Failed to reload Redis configuration:', error.message);
  }
}

const execAsync = promisify(exec);
const router = express.Router();

// System Status API endpoints
router.get('/status', async (req, res) => {
  try {
    console.log('Fetching system status...');
    const status = await getSystemStatus();
    console.log('System status fetched successfully');
    res.json(status);
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ 
      error: 'Failed to get system status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed system status
async function getSystemStatus() {
  const startTime = Date.now();
  
  // Database status
  const dbStatus = await checkDatabaseStatus();
  
  // Redis status
  const redisStatus = await checkRedisStatus();
  
  // Server status
  const serverStatus = await checkServerStatus();
  
  // System resources
  const systemResources = await getSystemResources();
  
  // Services status
  const servicesStatus = await checkServicesStatus();
  
  // Log files info
  const logFiles = await getLogFilesInfo();
  
  const responseTime = Date.now() - startTime;
  
  return {
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    overall: getOverallStatus(dbStatus, redisStatus, serverStatus),
    database: dbStatus,
    redis: redisStatus,
    server: serverStatus,
    system: systemResources,
    services: servicesStatus,
    logs: logFiles
  };
}

// Check database status
async function checkDatabaseStatus() {
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    const responseTime = Date.now() - startTime;
    
    // Get connection pool info
    const pool = sequelize.connectionManager.pool;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      connectionPool: {
        total: pool?.size || 0,
        used: pool?.used || 0,
        waiting: pool?.pending || 0,
        idle: pool?.idle || 0
      },
      dialect: sequelize.getDialect(),
      version: await getDatabaseVersion()
    };
  } catch (error) {
    console.error('Database status check failed:', error);
    return {
      status: 'error',
      error: error.message,
      responseTime: 'N/A'
    };
  }
}

// Check Redis status
async function checkRedisStatus() {
  if (!redis) {
    return {
      status: 'not_configured',
      error: 'Redis not configured',
      responseTime: 'N/A'
    };
  }
  
  try {
    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    const info = await redis.info('memory');
    const dbSize = await redis.dbsize();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      memory: parseRedisMemoryInfo(info),
      databaseSize: dbSize,
      connectedClients: await redis.client('list').then(clients => clients.split('\n').length - 1)
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      responseTime: 'N/A'
    };
  }
}

// Check server status
async function checkServerStatus() {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: formatUptime(uptime),
      uptimeSeconds: Math.floor(uptime),
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        arrayBuffers: formatBytes(memoryUsage.arrayBuffers)
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      cpuUsage: await getCpuUsage()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Get system resources
async function getSystemResources() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    
    return {
      memory: {
        total: formatBytes(totalMem),
        free: formatBytes(freeMem),
        used: formatBytes(totalMem - freeMem),
        usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100)
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        speed: `${cpus[0].speed} MHz`,
        loadAverage: os.loadavg()
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      uptime: formatUptime(os.uptime())
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// Check services status
async function checkServicesStatus() {
  const services = {};
  
  try {
    // Check if MySQL is running
    try {
      await execAsync('mysqladmin ping -h localhost');
      services.mysql = { status: 'running', port: 3306 };
    } catch {
      services.mysql = { status: 'stopped', port: 3306 };
    }
    
    // Check if Redis is running
    if (redis) {
      try {
        await redis.ping();
        services.redis = { status: 'running', port: 6379 };
      } catch {
        services.redis = { status: 'stopped', port: 6379 };
      }
    } else {
      services.redis = { status: 'not_configured', port: 6379 };
    }
    
    // Check if Node.js process is running
    services.nodejs = { 
      status: 'running', 
      pid: process.pid,
      version: process.version
    };
    
  } catch (error) {
    services.error = error.message;
  }
  
  return services;
}

// Get log files information
async function getLogFilesInfo() {
  try {
    const logDir = path.join(__dirname, '../logs');
    const files = await fs.readdir(logDir).catch(() => []);
    
    const logFiles = await Promise.all(
      files
        .filter(file => file.endsWith('.log'))
        .map(async (file) => {
          const filePath = path.join(logDir, file);
          const stats = await fs.stat(filePath).catch(() => null);
          
          if (!stats) return null;
          
          return {
            name: file,
            size: formatBytes(stats.size),
            modified: stats.mtime.toISOString(),
            path: filePath
          };
        })
    );
    
    return logFiles.filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Get database version
async function getDatabaseVersion() {
  try {
    const [results] = await sequelize.query('SELECT VERSION() as version');
    return results[0]?.version || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Parse Redis memory info
function parseRedisMemoryInfo(info) {
  const lines = info.split('\n');
  const memory = {};
  
  lines.forEach(line => {
    if (line.startsWith('used_memory_human:')) {
      memory.used = line.split(':')[1].trim();
    } else if (line.startsWith('used_memory_peak_human:')) {
      memory.peak = line.split(':')[1].trim();
    } else if (line.startsWith('maxmemory_human:')) {
      memory.max = line.split(':')[1].trim();
    }
  });
  
  return memory;
}

// Get CPU usage
async function getCpuUsage() {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const endTime = Date.now();
      
      const cpuPercent = (endUsage.user + endUsage.system) / ((endTime - startTime) * 1000) * 100;
      
      resolve({
        percent: Math.round(cpuPercent * 100) / 100,
        user: endUsage.user,
        system: endUsage.system
      });
    }, 100);
  });
}

// Get overall status
function getOverallStatus(dbStatus, redisStatus, serverStatus) {
  const statuses = [dbStatus.status, redisStatus.status, serverStatus.status];
  
  if (statuses.includes('error')) {
    return 'error';
  } else if (statuses.includes('warning')) {
    return 'warning';
  } else {
    return 'healthy';
  }
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Log file viewing endpoint
router.get('/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { lines = 100 } = req.query;
    
    // Security check - only allow .log files
    if (!filename.endsWith('.log')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const logPath = path.join(__dirname, '../logs', filename);
    
    // Check if file exists
    try {
      await fs.access(logPath);
    } catch {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Read last N lines
    const content = await fs.readFile(logPath, 'utf8');
    const linesArray = content.split('\n');
    const lastLines = linesArray.slice(-parseInt(lines)).join('\n');
    
    res.json({
      filename,
      content: lastLines,
      totalLines: linesArray.length,
      requestedLines: parseInt(lines)
    });
    
  } catch (error) {
    console.error('Log file error:', error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

// Clear logs endpoint
router.post('/logs/clear', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const logPath = path.join(__dirname, '../logs', filename);
    
    // Clear the log file
    await fs.writeFile(logPath, '');
    
    res.json({ success: true, message: 'Log file cleared successfully' });
    
  } catch (error) {
    console.error('Clear log error:', error);
    res.status(500).json({ error: 'Failed to clear log file' });
  }
});

// Test Redis connection endpoint
router.post('/redis/test', async (req, res) => {
  try {
    const { host, port, password, db, enabled, url, cloudProvider } = req.body;
    
    if (!enabled) {
      return res.json({
        success: true,
        message: 'Redis is disabled',
        status: 'disabled'
      });
    }
    
    let testClient = null;
    const startTime = Date.now();
    
    try {
      if (url) {
        // Auto-fix URL format if missing protocol
        let redisUrl = url.trim();
        if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
          // If it's just hostname:port, add redis:// prefix
          if (redisUrl.includes(':') && !redisUrl.includes('://')) {
            redisUrl = `redis://${redisUrl}`;
            console.log(`Auto-fixed URL format: ${redisUrl}`);
          } else {
            throw new Error('Invalid Redis URL format - URL must be in format: redis://username:password@host:port or host:port');
          }
        }
        
        // Parse URL to extract components
        let urlObj;
        try {
          urlObj = new URL(redisUrl);
        } catch (urlError) {
          throw new Error(`Invalid URL format: ${urlError.message}. Please use format: redis://username:password@host:port`);
        }
        
        const hostname = urlObj.hostname;
        const port = urlObj.port || (redisUrl.startsWith('rediss://') ? '6380' : '6379');
        const username = urlObj.username || 'default';
        const password = urlObj.password || '';
        
        console.log(`Testing Redis Cloud connection to ${hostname}:${port}...`);
        
        // Cloud configuration using individual parameters
        const Redis = require('ioredis');
        testClient = new Redis({
          host: hostname,
          port: parseInt(port),
          username: username,
          password: password,
          db: 0,
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryDelayOnFailover: 1000,
          maxRetriesPerRequest: 1,
          lazyConnect: false,
          enableOfflineQueue: false,
          enableReadyCheck: true,
          maxLoadingTimeout: 10000,
          retryDelayOnClusterDown: 300,
          enableAutoPipelining: false,
          keepAlive: 30000,
          family: 4
        });
        
        // Add event listeners for debugging
        testClient.on('connect', () => {
          console.log('Redis Cloud: Connected');
        });
        
        testClient.on('ready', () => {
          console.log('Redis Cloud: Ready');
        });
        
        testClient.on('error', (err) => {
          console.error('Redis Cloud Error:', err.message);
        });
        
        testClient.on('close', () => {
          console.log('Redis Cloud: Connection closed');
        });
        
      } else {
        // Self-hosted configuration
        console.log('Testing self-hosted Redis connection...');
        const Redis = require('ioredis');
        testClient = new Redis({
          host: host || 'localhost',
          port: parseInt(port) || 6379,
          password: password || undefined,
          db: parseInt(db) || 0,
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryDelayOnFailover: 1000,
          maxRetriesPerRequest: 1,
          lazyConnect: false,
          enableOfflineQueue: false,
          enableReadyCheck: true,
          maxLoadingTimeout: 10000,
          retryDelayOnClusterDown: 300,
          enableAutoPipelining: false,
          keepAlive: 30000,
          family: 4
        });
      }
      
      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - Redis server not responding'));
        }, 10000);
        
        testClient.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        testClient.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      // Test with ping command
      const pingResult = await testClient.ping();
      const responseTime = Date.now() - startTime;
      
      if (pingResult !== 'PONG') {
        throw new Error('Ping test failed - unexpected response');
      }
      
      // Get Redis info
      let info = {};
      let memoryInfo = {};
      let dbSize = 0;
      
      try {
        info = await testClient.info('server');
        memoryInfo = await testClient.info('memory');
        dbSize = await testClient.dbsize();
      } catch (infoError) {
        console.warn('Could not get Redis info:', infoError.message);
      }
      
      // Close test connection
      await testClient.quit();
      
      res.json({
        success: true,
        message: url ? 'Redis Cloud connection successful' : 'Redis connection successful',
        status: 'healthy',
        type: url ? 'cloud' : 'self-hosted',
        cloudProvider: cloudProvider || null,
        responseTime: `${responseTime}ms`,
        pingResult: pingResult,
        info: {
          version: parseRedisInfo(info, 'redis_version'),
          uptime: parseRedisInfo(info, 'uptime_in_seconds'),
          connectedClients: parseRedisInfo(info, 'connected_clients'),
          memory: parseRedisMemoryInfo(memoryInfo),
          databaseSize: dbSize
        }
      });
      
    } catch (connectionError) {
      console.error('Redis connection test failed:', connectionError);
      
      // Clean up test client if it was created
      if (testClient) {
        try {
          await testClient.quit();
        } catch (quitError) {
          console.warn('Error closing test client:', quitError.message);
        }
      }
      
      // Return a more user-friendly error message
      let errorMessage = 'Redis connection failed';
      let errorCode = connectionError.code || 'UNKNOWN';
      
      if (connectionError.message.includes('ECONNREFUSED') || errorCode === 'ECONNREFUSED') {
        errorMessage = 'Redis server is not running or not accessible';
      } else if (connectionError.message.includes('timeout') || errorCode === 'ETIMEDOUT') {
        errorMessage = 'Redis connection timeout - server may be unreachable';
      } else if (connectionError.message.includes('max retries')) {
        errorMessage = 'Redis server is not responding';
      } else if (connectionError.message.includes('NOAUTH') || errorCode === 'NOAUTH') {
        errorMessage = 'Redis authentication failed - check password';
      } else if (connectionError.message.includes('Stream isn\'t writeable')) {
        errorMessage = 'Redis server is not running or not accessible';
      } else if (connectionError.message.includes('ENOTFOUND') || errorCode === 'ENOTFOUND') {
        errorMessage = 'Redis host not found - check hostname';
      } else if (connectionError.message.includes('EHOSTUNREACH') || errorCode === 'EHOSTUNREACH') {
        errorMessage = 'Redis host is unreachable - check network';
      } else if (connectionError.message.includes('Invalid URL') || connectionError.message.includes('Invalid Redis URL format')) {
        errorMessage = 'Invalid Redis URL format - use redis://username:password@host:port or just host:port';
      } else if (connectionError.message.includes('ECONNREFUSED') || connectionError.message.includes('Connection refused')) {
        errorMessage = 'Redis server is not running or not accessible';
      } else if (errorCode === 'ECONNRESET') {
        errorMessage = 'Redis connection was reset - check if server is running';
      } else if (errorCode === 'ENETUNREACH') {
        errorMessage = 'Network unreachable - check internet connection';
      } else if (connectionError.message.includes('Connection timeout')) {
        errorMessage = 'Redis connection timeout - server is not responding';
      } else {
        errorMessage = 'Redis connection failed - check your URL format and credentials';
      }
      
      res.json({
        success: false,
        message: errorMessage,
        status: 'error',
        errorCode: errorCode,
        details: connectionError.message,
        troubleshooting: {
          cloudProvider: cloudProvider || 'unknown',
          urlProvided: !!url,
          hostProvided: !!host,
          suggestions: [
            'Check if Redis Cloud database is active',
            'Verify username and password are correct',
            'Ensure URL format is: redis://username:password@host:port',
            'Check network connectivity to Redis Cloud'
          ]
        }
      });
    }
    
  } catch (error) {
    console.error('Redis test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Redis test',
      status: 'error',
      details: error.message
    });
  }
});

// Helper function to parse Redis info
function parseRedisInfo(info, key) {
  const lines = info.split('\n');
  for (const line of lines) {
    if (line.startsWith(key + ':')) {
      return line.split(':')[1].trim();
    }
  }
  return 'N/A';
}

module.exports = router;
