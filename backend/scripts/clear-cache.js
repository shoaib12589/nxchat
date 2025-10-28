#!/usr/bin/env node

const { cache, redis } = require('../config/redis');

console.log('🧹 NxChat Cache Clear Script');
console.log('============================\n');

async function clearAllCaches() {
  try {
    console.log('🔄 Clearing Redis cache...');
    await cache.clear();
    console.log('✅ Redis cache cleared successfully\n');

    console.log('🔄 Testing Redis connection...');
    await redis.ping();
    console.log('✅ Redis connection is healthy\n');

    console.log('📊 Cache Statistics:');
    console.log('===================');
    const info = await redis.info('memory');
    console.log('Memory usage:', info.split('\n').find(line => line.startsWith('used_memory_human:')) || 'N/A');
    
    const dbSize = await redis.dbsize();
    console.log('Database size:', dbSize, 'keys');
    
    console.log('\n🎉 All caches cleared successfully!');
    console.log('Your application will now use fresh data from the database.');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    console.log('\n💡 Make sure Redis is running:');
    console.log('   - Windows: Download Redis from https://github.com/microsoftarchive/redis/releases');
    console.log('   - macOS: brew install redis && brew services start redis');
    console.log('   - Linux: sudo apt-get install redis-server && sudo systemctl start redis');
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

// Run cache clear
clearAllCaches();
