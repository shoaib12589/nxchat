const { SystemSetting } = require('../models');
require('dotenv').config();

async function quickRedisSetup() {
  try {
    console.log('🔧 Quick Redis Setup\n');
    console.log('Enter your Redis Cloud credentials (or press Enter to skip):\n');
    
    const args = process.argv.slice(2);
    
    let host, port, password, db;
    
    if (args.length >= 3) {
      host = args[0];
      port = args[1];
      password = args[2];
      db = args[3] || '0';
      console.log(`Using provided credentials:
  Host: ${host}
  Port: ${port}
  DB: ${db}\n`);
    } else {
      console.log('Usage: node scripts/quick-redis-setup.js <host> <port> <password> [db]');
      console.log('Example: node scripts/quick-redis-setup.js redis-12345.c12345.us-east-1-4.ec2.redns.redis-cloud.com 12345 your_password 0\n');
      console.log('Or configure via admin panel at: http://localhost:3000/superadmin/settings\n');
      process.exit(0);
    }
    
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
        value: host,
        description: 'Redis Cloud hostname',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_port',
        value: port,
        description: 'Redis Cloud port',
        category: 'redis',
        is_encrypted: false
      },
      {
        setting_key: 'redis_password',
        value: password,
        description: 'Redis Cloud password',
        category: 'redis',
        is_encrypted: true
      },
      {
        setting_key: 'redis_db',
        value: db,
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
    
    for (const setting of redisSettings) {
      await SystemSetting.upsert({
        setting_key: setting.setting_key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        is_encrypted: setting.is_encrypted,
        updated_by: 1
      });
      console.log(`✅ Saved: ${setting.setting_key}`);
    }
    
    console.log('\n🎉 Redis configuration saved!');
    console.log('🔄 Please restart your server to apply changes.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

quickRedisSetup().then(() => process.exit(0));

