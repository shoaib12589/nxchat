/**
 * Script to initialize default storage provider setting
 * Run: node scripts/initialize-default-storage-provider.js
 */

const { sequelize } = require('../config/database');
const { SystemSetting } = require('../models');
require('dotenv').config();

async function initializeDefaultStorageProvider() {
  try {
    console.log('🔧 Initializing default storage provider setting...');

    // Check if setting already exists
    const existing = await SystemSetting.findOne({
      where: { setting_key: 'default_storage_provider' }
    });

    if (existing) {
      console.log('✅ Default storage provider setting already exists');
      console.log(`   Current value: ${existing.value || '(empty)'}`);
      return;
    }

    // Create the setting with default value 'r2'
    await SystemSetting.create({
      setting_key: 'default_storage_provider',
      value: 'r2',
      description: 'Default storage provider (r2, wasabi, s3)',
      category: 'storage',
      is_encrypted: false
    });

    console.log('✅ Default storage provider setting created successfully');
    console.log('   Default value: r2 (Cloudflare R2)');
    console.log('');
    console.log('💡 You can update this value in the Superadmin Dashboard > Settings > System > Storage Configuration');

  } catch (error) {
    console.error('❌ Error initializing default storage provider setting:', error);
    throw error;
  }
}

// Run the script
initializeDefaultStorageProvider()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

