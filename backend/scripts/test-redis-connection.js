const { SystemSetting } = require('../models');
const Redis = require('ioredis');
require('dotenv').config();

async function testRedisConnection() {
  try {
    console.log('🔍 Testing Redis connection...\n');
    
    // Load Redis configuration from database
    const settings = await SystemSetting.findAll({
      where: { category: 'redis' }
    });
    
    const config = {};
    settings.forEach(setting => {
      config[setting.setting_key] = setting.value;
    });
    
    if (!config.redis_enabled || config.redis_enabled !== 'true') {
      console.log('❌ Redis is disabled in system settings');
      console.log('💡 Please enable Redis in the admin settings or run: node scripts/configure-redis-cloud.js');
      process.exit(1);
    }
    
    console.log('📋 Redis Configuration:');
    console.log(`   Host: ${config.redis_host}`);
    console.log(`   Port: ${config.redis_port}`);
    console.log(`   Database: ${config.redis_db}`);
    console.log(`   Enabled: ${config.redis_enabled}`);
    console.log('');
    
    // Create Redis client
    const redis = new Redis({
      host: config.redis_host,
      port: parseInt(config.redis_port),
      password: config.redis_password,
      db: parseInt(config.redis_db),
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    
    // Test connection
    console.log('🔄 Attempting to connect to Redis...');
    
    redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });
    
    redis.on('ready', async () => {
      console.log('✅ Redis ready for operations\n');
      
      // Test operations
      try {
        // Set a test key
        await redis.set('test_key', 'Hello Redis!', 'EX', 10);
        console.log('✅ SET operation successful');
        
        // Get the test key
        const value = await redis.get('test_key');
        console.log(`✅ GET operation successful: ${value}`);
        
        // Delete the test key
        await redis.del('test_key');
        console.log('✅ DEL operation successful');
        
        // Get Redis info
        const info = await redis.info('server');
        console.log('\n📊 Redis Server Info:');
        console.log(info.split('\n').slice(0, 5).join('\n'));
        
        console.log('\n🎉 Redis connection test successful!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during Redis operations:', error);
        process.exit(1);
      }
    });
    
    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check your Redis Cloud credentials');
      console.log('   2. Verify your host and port are correct');
      console.log('   3. Ensure your Redis Cloud instance is active');
      console.log('   4. Check firewall/security group settings');
      process.exit(1);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.error('❌ Connection timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
testRedisConnection();

