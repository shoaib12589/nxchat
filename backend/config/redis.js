const Redis = require('ioredis');
const { Op } = require('sequelize');
require('dotenv').config();

// Redis configuration - will be loaded from database
let redis = null;
let isRedisEnabled = false;
let redisConfig = {};

// Function to parse Redis URL
function parseRedisUrl(url) {
  if (!url) return null;
  
  try {
    let redisUrl = url.trim();
    
    // Auto-fix URL format if missing protocol
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      if (redisUrl.includes(':') && redisUrl.includes('@')) {
        redisUrl = `redis://${redisUrl}`;
      } else if (redisUrl.includes(':')) {
        // If it's just hostname:port, add redis:// prefix
        redisUrl = `redis://${redisUrl}`;
      }
    }
    
    const urlObj = new URL(redisUrl);
    
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || (redisUrl.startsWith('rediss://') ? 6380 : 6379),
      username: urlObj.username || null,
      password: urlObj.password || null,
      protocol: redisUrl.startsWith('rediss://') ? 'rediss' : 'redis'
    };
  } catch (error) {
    console.warn('Failed to parse Redis URL:', error.message);
    return null;
  }
}

// Function to load Redis configuration from database
async function loadRedisConfig() {
  try {
    // Close existing Redis connection if any
    if (redis) {
      try {
        await redis.quit();
      } catch (error) {
        // Ignore errors when closing
      }
      redis = null;
    }

    const { SystemSetting } = require('../models');
    
    const settings = await SystemSetting.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'redis_enabled', 
            'redis_host', 
            'redis_port', 
            'redis_password', 
            'redis_db', 
            'redis_url',
            'redis_cloud_provider'
          ]
        }
      }
    });
    
    const config = {};
    settings.forEach(setting => {
      config[setting.setting_key] = setting.value;
    });
    
    isRedisEnabled = config.redis_enabled === 'true';
    
    if (isRedisEnabled) {
      // Check if Redis Cloud URL is provided
      if (config.redis_url && config.redis_url.trim()) {
        const urlParts = parseRedisUrl(config.redis_url);
        if (urlParts) {
          redisConfig = {
            host: urlParts.host,
            port: urlParts.port,
            username: urlParts.username,
            password: urlParts.password,
            db: parseInt(config.redis_db) || 0,
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
          };
          
          console.log(`✅ Parsed Redis Cloud URL: ${urlParts.host}:${urlParts.port}`);
          if (urlParts.username) {
            console.log(`✅ Using username authentication: ${urlParts.username}`);
          }
        } else {
          throw new Error('Invalid Redis URL format');
        }
      } else {
        // Use individual host/port/password configuration
        redisConfig = {
          host: config.redis_host || 'localhost',
          port: parseInt(config.redis_port) || 6379,
          password: config.redis_password || null,
          db: parseInt(config.redis_db) || 0,
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
        };
      }
      
      // Create Redis client
      redis = new Redis(redisConfig);
      
      // Set up error handlers before connecting
      redis.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('ready', () => {
        console.log('✅ Redis ready for operations');
      });

      redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
      
      // Connect to Redis
      try {
        await redis.connect();
        console.log('✅ Redis client created and connected with database configuration');
      } catch (connectError) {
        console.warn('⚠️ Redis connection failed:', connectError.message);
        console.log('ℹ️ Application will continue without Redis');
        redis = null;
      }
    } else {
      console.log('ℹ️ Redis is disabled in database settings');
    }
  } catch (error) {
    console.warn('Failed to load Redis configuration from database:', error.message);
    // Fallback to environment variables
    isRedisEnabled = process.env.REDIS_ENABLED === 'true' || false;
    if (isRedisEnabled) {
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        const urlParts = parseRedisUrl(redisUrl);
        if (urlParts) {
          redisConfig = {
            host: urlParts.host,
            port: urlParts.port,
            username: urlParts.username,
            password: urlParts.password,
            db: parseInt(process.env.REDIS_DB) || 0,
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
          };
        }
      } else {
        redisConfig = {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || null,
          db: parseInt(process.env.REDIS_DB) || 0,
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
        };
      }
      
      try {
        redis = new Redis(redisConfig);
        
        // Set up error handlers
        redis.on('error', (err) => {
          console.warn('⚠️ Redis connection error:', err.message);
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('ready', () => {
          console.log('✅ Redis ready for operations');
        });
        
        await redis.connect();
        console.log('✅ Redis client created and connected with environment configuration');
      } catch (error) {
        console.warn('Failed to create Redis client:', error.message);
        redis = null;
      }
    }
  }
}

// Initialize Redis configuration
loadRedisConfig();

// Export reload function for runtime config updates
async function reloadRedisConfig() {
  await loadRedisConfig();
}

// Cache utility functions
const cache = {
  // Set cache with TTL
  async set(key, value, ttl = 3600) {
    if (!redis || redis.status !== 'ready') {
      // Silently skip if Redis is not available
      return false;
    }
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      // Don't log errors for missing Redis - graceful degradation
      return false;
    }
  },

  // Get cache
  async get(key) {
    if (!redis || redis.status !== 'ready') {
      return null;
    }
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Don't log errors for missing Redis
      return null;
    }
  },

  // Delete cache
  async del(key) {
    if (!redis || redis.status !== 'ready') {
      return false;
    }
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear all cache
  async clear() {
    if (!redis) {
      console.warn('Redis not available, cache clear skipped');
      return false;
    }
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  },

  // Get or set cache
  async getOrSet(key, fetchFunction, ttl = 3600) {
    if (!redis || redis.status !== 'ready') {
      // Fall back to direct fetch if Redis is not available
      return await fetchFunction();
    }
    try {
      // Try to get from cache first
      let value = await this.get(key);
      
      if (value === null) {
        // Cache miss - fetch from source
        value = await fetchFunction();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }
      
      return value;
    } catch (error) {
      // Fallback to direct fetch on error
      return await fetchFunction();
    }
  },

  // Batch operations
  async mget(keys) {
    if (!redis) {
      console.warn('Redis not available, mget skipped');
      return keys.map(() => null);
    }
    try {
      const values = await redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  },

  async mset(keyValuePairs, ttl = 3600) {
    if (!redis) {
      console.warn('Redis not available, mset skipped');
      return false;
    }
    try {
      const pipeline = redis.pipeline();
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }
};

module.exports = { redis, cache, loadRedisConfig, reloadRedisConfig };
