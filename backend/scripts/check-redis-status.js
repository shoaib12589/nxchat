const { SystemSetting } = require('../models');
require('dotenv').config();

async function checkRedisStatus() {
  try {
    console.log('🔍 Checking Redis Configuration...\n');
    
    const settings = await SystemSetting.findAll({
      where: { category: 'redis' }
    });
    
    if (settings.length === 0) {
      console.log('❌ Redis is not configured yet.');
      console.log('💡 Run: node scripts/configure-redis-cloud.js\n');
      process.exit(1);
    }
    
    const config = {};
    settings.forEach(setting => {
      config[setting.setting_key] = setting.value;
    });
    
    console.log('📋 Current Redis Configuration:');
    console.log(`   Enabled: ${config.redis_enabled || 'false'}`);
    console.log(`   Host: ${config.redis_host || 'not set'}`);
    console.log(`   Port: ${config.redis_port || 'not set'}`);
    console.log(`   Database: ${config.redis_db || 'not set'}`);
    console.log(`   Connection Type: ${config.redis_connection_type || 'not set'}`);
    console.log(`   Provider: ${config.redis_cloud_provider || 'not set'}`);
    console.log(`   Password: ${config.redis_password ? '***' : 'not set'}\n`);
    
    if (config.redis_enabled === 'true' && config.redis_host && config.redis_port) {
      console.log('✅ Redis is configured and enabled.');
      console.log('💡 To test the connection, run: node scripts/test-redis-connection.js\n');
    } else {
      console.log('⚠️ Redis configuration is incomplete.');
      console.log('💡 Configure Redis via admin panel or run: node scripts/configure-redis-cloud.js\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRedisStatus().then(() => process.exit(0));

