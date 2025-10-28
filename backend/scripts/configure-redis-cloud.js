const { SystemSetting } = require('../models');
require('dotenv').config();

async function configureRedisCloud() {
  try {
    console.log('🔧 Configuring Redis Cloud connection...');
    
    // Get Redis Cloud credentials from user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    console.log('\n📋 Please enter your Redis Cloud credentials:');
    console.log('You can find these at: https://redis.com/try-free/\n');
    
    const host = await question('Redis Host (e.g., redis-12345.c12345.us-east-1-4.ec2.redns.redis-cloud.com): ');
    const port = await question('Redis Port (e.g., 12345): ');
    const password = await question('Redis Password: ');
    const db = await question('Database Number (default: 0): ') || '0';
    
    rl.close();

    if (!host || !port || !password) {
      console.error('❌ Missing required Redis credentials');
      process.exit(1);
    }

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
    
    // Save each setting
    for (const setting of redisSettings) {
      await SystemSetting.upsert({
        where: {
          setting_key: setting.setting_key,
          category: 'redis'
        },
        defaults: {
          setting_key: setting.setting_key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          is_encrypted: setting.is_encrypted,
          updated_by: 1
        }
      }, {
        setting_key: setting.setting_key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        is_encrypted: setting.is_encrypted,
        updated_by: 1
      });
      console.log(`✅ Saved: ${setting.setting_key}`);
    }
    
    console.log('\n🎉 Redis configuration saved successfully!');
    console.log('🔄 Please restart the server to apply changes.\n');
    
  } catch (error) {
    console.error('❌ Error configuring Redis:', error);
    process.exit(1);
  }
}

// Run the script
configureRedisCloud()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

