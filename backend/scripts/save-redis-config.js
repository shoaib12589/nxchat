const { SystemSetting } = require('../models');
require('dotenv').config();

async function saveRedisConfig() {
  try {
    console.log('Saving Redis configuration to database...');
    
    // Redis configuration settings
    const redisSettings = [
      {
        setting_key: 'redis_enabled',
        value: 'true',
        description: 'Enable Redis caching and session management',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_host',
        value: 'redis-16812.c52.us-east-1-4.ec2.redns.redis-cloud.com',
        description: 'Redis Cloud hostname',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_port',
        value: '16812',
        description: 'Redis Cloud port',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_password',
        value: 'YOUR_REDIS_PASSWORD', // Replace with your actual password
        description: 'Redis Cloud password',
        category: 'redis',
        is_encrypted: true
      },
      {
        setting_key: 'redis_db',
        value: '0',
        description: 'Redis database number',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_connection_type',
        value: 'cloud',
        description: 'Redis connection type (self-hosted or cloud)',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_cloud_provider',
        value: 'redis-cloud',
        description: 'Redis Cloud provider',
        category: 'redis',
        is_encrypted: false
      }
    ];
    
    // Save each setting
    for (const setting of redisSettings) {
      await SystemSetting.upsert({
        setting_key: setting.setting_key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        is_encrypted: setting.is_encrypted,
        updated_by: 1 // Super admin user ID
      });
      console.log(`✅ Saved: ${setting.setting_key}`);
    }
    
    console.log('🎉 Redis configuration saved successfully!');
    console.log('📝 Note: Please update redis_password with your actual Redis Cloud password');
    
  } catch (error) {
    console.error('❌ Error saving Redis configuration:', error);
  }
}

// Run the script
saveRedisConfig().then(() => {
  console.log('Script completed');
  process.exit(0);
});
