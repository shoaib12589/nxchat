const { cache } = require('../config/redis');

// Cache middleware for API routes
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on URL and query parameters
    const cacheKey = `api:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData !== null) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedData);
      }
      
      // Cache miss - continue to route handler
      // Don't log cache miss to reduce noise
      
      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Try to cache the response, but don't fail if Redis is unavailable
        cache.set(cacheKey, data, ttl).catch(() => {
          // Silently fail if cache is unavailable
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      // Continue without caching if there's an error
      next();
    }
  };
};

// Cache invalidation helper
const invalidateCache = async (pattern) => {
  try {
    const { redis } = require('../config/redis');
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Specific cache patterns for different entities
const cachePatterns = {
  user: (userId) => `api:*/users/${userId}*`,
  company: (companyId) => `api:*/companies/${companyId}*`,
  chat: (chatId) => `api:*/chats/${chatId}*`,
  visitor: (visitorId) => `api:*/visitors/${visitorId}*`,
  widget: (tenantId) => `api:*/widget*tenant_id=${tenantId}*`,
  settings: (tenantId) => `api:*/settings*tenant_id=${tenantId}*`
};

// Cache invalidation functions
const invalidateUserCache = (userId) => invalidateCache(cachePatterns.user(userId));
const invalidateCompanyCache = (companyId) => invalidateCache(cachePatterns.company(companyId));
const invalidateChatCache = (chatId) => invalidateCache(cachePatterns.chat(chatId));
const invalidateVisitorCache = (visitorId) => invalidateCache(cachePatterns.visitor(visitorId));
const invalidateWidgetCache = (tenantId) => invalidateCache(cachePatterns.widget(tenantId));
const invalidateSettingsCache = (tenantId) => invalidateCache(cachePatterns.settings(tenantId));

// Memory cache for frequently accessed data
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 60000; // 1 minute

const memoryCacheMiddleware = (ttl = MEMORY_CACHE_TTL) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `memory:${req.originalUrl}`;
    const cached = memoryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`Memory cache hit for key: ${cacheKey}`);
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function(data) {
      memoryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Clean up old entries periodically
      if (memoryCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of memoryCache.entries()) {
          if (now - value.timestamp > ttl) {
            memoryCache.delete(key);
          }
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateUserCache,
  invalidateCompanyCache,
  invalidateChatCache,
  invalidateVisitorCache,
  invalidateWidgetCache,
  invalidateSettingsCache,
  memoryCacheMiddleware,
  cachePatterns
};
