/**
 * Cached Banned IP Service
 * Provides efficient caching for banned IP lookups to avoid repeated database queries
 */

const { BannedIP } = require('../models');
const { cache } = require('../config/redis');

// In-memory cache as fallback (cleared on server restart)
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all banned IP addresses for a tenant (cached)
 */
async function getBannedIPsForTenant(tenantId) {
  const cacheKey = `banned_ips:tenant:${tenantId}`;
  
  try {
    // Try Redis cache first
    if (cache && cache.isOpen) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Try memory cache
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      return memoryCached.data;
    }
    
    // Fetch from database
    const bannedIPs = await BannedIP.findAll({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      attributes: ['ip_address'],
      raw: true // Return plain objects for better performance
    });
    
    const ipAddresses = bannedIPs.map(bip => bip.ip_address);
    
    // Cache in Redis (5 minutes TTL)
    if (cache && cache.isOpen) {
      await cache.set(cacheKey, JSON.stringify(ipAddresses), 300).catch(() => {
        // Silently fail if Redis is unavailable
      });
    }
    
    // Cache in memory
    memoryCache.set(cacheKey, {
      data: ipAddresses,
      timestamp: Date.now()
    });
    
    return ipAddresses;
  } catch (error) {
    console.error('Error fetching banned IPs:', error);
    // Return empty array on error to avoid blocking requests
    return [];
  }
}

/**
 * Check if a specific IP is banned (optimized with caching)
 */
async function isIPBanned(ipAddress, tenantId) {
  if (!ipAddress || ipAddress === 'Unknown' || ipAddress === null) {
    return false;
  }
  
  const cacheKey = `banned_ip:${tenantId}:${ipAddress}`;
  
  try {
    // Try Redis cache first
    if (cache && cache.isOpen) {
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached === 'true';
      }
    }
    
    // Try memory cache
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      return memoryCached.data;
    }
    
    // Check database
    const bannedIP = await BannedIP.findOne({
      where: {
        ip_address: ipAddress,
        tenant_id: tenantId,
        is_active: true
      },
      attributes: ['id'], // Only need to know if it exists
      raw: true
    });
    
    const isBanned = !!bannedIP;
    
    // Cache result (5 minutes TTL)
    if (cache && cache.isOpen) {
      await cache.set(cacheKey, isBanned ? 'true' : 'false', 300).catch(() => {
        // Silently fail if Redis is unavailable
      });
    }
    
    // Cache in memory
    memoryCache.set(cacheKey, {
      data: isBanned,
      timestamp: Date.now()
    });
    
    return isBanned;
  } catch (error) {
    console.error('Error checking banned IP:', error);
    // Return false on error to avoid blocking legitimate requests
    return false;
  }
}

/**
 * Invalidate banned IP cache for a tenant
 */
async function invalidateBannedIPCache(tenantId, ipAddress = null) {
  try {
    // Invalidate tenant-level cache
    const tenantCacheKey = `banned_ips:tenant:${tenantId}`;
    
    if (cache && cache.isOpen) {
      await cache.del(tenantCacheKey).catch(() => {});
    }
    memoryCache.delete(tenantCacheKey);
    
    // Invalidate specific IP cache if provided
    if (ipAddress) {
      const ipCacheKey = `banned_ip:${tenantId}:${ipAddress}`;
      if (cache && cache.isOpen) {
        await cache.del(ipCacheKey).catch(() => {});
      }
      memoryCache.delete(ipCacheKey);
    }
  } catch (error) {
    console.error('Error invalidating banned IP cache:', error);
  }
}

/**
 * Clean up old memory cache entries periodically
 */
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > MEMORY_CACHE_TTL) {
      memoryCache.delete(key);
    }
  }
}

// Clean up memory cache every 5 minutes
setInterval(cleanupMemoryCache, 5 * 60 * 1000);

module.exports = {
  getBannedIPsForTenant,
  isIPBanned,
  invalidateBannedIPCache
};

