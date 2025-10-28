const Redis = require('ioredis');
require('dotenv').config();

// Redis configuration - will be loaded from database
let redis = null;
let isRedisEnabled = false;
let redisConfig = {};

// Function to load Redis configuration from database
async function loadRedisConfig() {
  try {
    const { SystemSetting } = require('../models');
    
    const settings = await SystemSetting.findAll({
      where: { category: 'redis' }
    });
    
    const config = {};
    settings.forEach(setting => {
      config[setting.setting_key] = setting.value;
    });
    
    isRedisEnabled = config.redis_enabled === 'true';
    
    if (isRedisEnabled) {
      redisConfig = {
        host: config.redis_host || 'localhost',
        port: parseInt(config.redis_port) || 6379,
        password: config.redis_password || null,
        db: parseInt(config.redis_db) || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 5000,
        commandTimeout: 3000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false,
        maxLoadingTimeout: 5000,
        family: 4,
        keepAlive: true,
        enableAutoPipelining: true
      };
      
      // Create Redis client
      redis = new Redis(redisConfig);
      console.log('✅ Redis client created with database configuration');
    } else {
      console.log('ℹ️ Redis is disabled in database settings');
    }
  } catch (error) {
    console.warn('Failed to load Redis configuration from database:', error.message);
    // Fallback to environment variables
    isRedisEnabled = process.env.REDIS_ENABLED === 'true' || false;
    if (isRedisEnabled) {
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 5000,
        commandTimeout: 3000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false,
        maxLoadingTimeout: 5000,
        family: 4,
        keepAlive: true,
        enableAutoPipelining: true
      };
      
      try {
        redis = new Redis(redisConfig);
        console.log('✅ Redis client created with environment configuration');
      } catch (error) {
        console.warn('Failed to create Redis client:', error.message);
        redis = null;
      }
    }
  }
}

// Initialize Redis configuration
loadRedisConfig();

// Redis error handling (only if Redis is enabled)
if (redis) {
  redis.on('error', (err) => {
    console.warn('⚠️ Redis connection error:', err.message);
    // Don't crash the app if Redis fails
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
  
  // Connect to Redis with error handling
  redis.connect().catch(err => {
    console.warn('⚠️ Redis connection failed - running without Redis:', err.message);
    console.log('ℹ️ Some features may not work optimally without Redis');
  });
}

// Cache utility functions
const cache = {
  // Set cache with TTL
  async set(key, value, ttl = 3600) {
    if (!redis || !redis.isOpen) {
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
    if (!redis || !redis.isOpen) {
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
    if (!redis || !redis.isOpen) {
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
    if (!redis || !redis.isOpen) {
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

module.exports = { redis, cache };
