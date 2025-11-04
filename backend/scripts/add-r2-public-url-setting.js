/**
 * Script to add R2 Public URL setting to system_settings table
 * Run: node scripts/add-r2-public-url-setting.js
 */

const { sequelize } = require('../config/database');
const { SystemSetting } = require('../models');
require('dotenv').config();

async function addR2PublicUrlSetting() {
  try {
    console.log('🔧 Adding R2 Public URL setting...');

    // Check if setting already exists
    const existing = await SystemSetting.findOne({
      where: { setting_key: 'r2_public_url' }
    });

    if (existing) {
      console.log('✅ R2 Public URL setting already exists');
      console.log(`   Current value: ${existing.value || '(empty)'}`);
      return;
    }

    // Create the setting with default value from user's URL
    const defaultUrl = 'https://pub-c858b39707e84202a98190bd7fa92be4.r2.dev';
    
    await SystemSetting.create({
      setting_key: 'r2_public_url',
      value: defaultUrl,
      description: 'Cloudflare R2 public URL for file access (e.g., https://pub-xxx.r2.dev)',
      category: 'storage',
      is_encrypted: false
    });

    console.log('✅ R2 Public URL setting created successfully');
    console.log(`   Default value: ${defaultUrl}`);
    console.log('');
    console.log('💡 You can update this value in the Superadmin Dashboard > Settings > System > Storage Configuration');

  } catch (error) {
    console.error('❌ Error adding R2 Public URL setting:', error);
    throw error;
  }
}

// Run the script
addR2PublicUrlSetting()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

