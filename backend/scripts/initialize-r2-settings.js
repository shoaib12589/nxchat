/**
 * Script to initialize R2 settings from environment variables
 * Run: node scripts/initialize-r2-settings.js
 */

const { sequelize } = require('../config/database');
const { SystemSetting } = require('../models');
require('dotenv').config();

async function initializeR2Settings() {
  try {
    console.log('🔧 Initializing R2 settings from environment variables...');

    const r2Settings = [
      {
        key: 'r2_access_key_id',
        value: process.env.R2_ACCESS_KEY_ID || '',
        description: 'Cloudflare R2 Access Key ID',
        category: 'storage',
        is_encrypted: true
      },
      {
        key: 'r2_secret_access_key',
        value: process.env.R2_SECRET_ACCESS_KEY || '',
        description: 'Cloudflare R2 Secret Access Key',
        category: 'storage',
        is_encrypted: true
      },
      {
        key: 'r2_bucket_name',
        value: process.env.R2_BUCKET_NAME || 'nxchat',
        description: 'Cloudflare R2 Bucket Name',
        category: 'storage',
        is_encrypted: false
      },
      {
        key: 'r2_endpoint',
        value: process.env.R2_ENDPOINT || '',
        description: 'Cloudflare R2 Endpoint URL (e.g., https://xxx.r2.cloudflarestorage.com)',
        category: 'storage',
        is_encrypted: false
      },
      {
        key: 'r2_region',
        value: process.env.R2_REGION || 'auto',
        description: 'Cloudflare R2 Region (usually "auto")',
        category: 'storage',
        is_encrypted: false
      },
      {
        key: 'r2_public_url',
        value: process.env.R2_PUBLIC_URL || 'https://pub-c858b39707e84202a98190bd7fa92be4.r2.dev',
        description: 'Cloudflare R2 public URL for file access (e.g., https://pub-xxx.r2.dev)',
        category: 'storage',
        is_encrypted: false
      }
    ];

    let created = 0;
    let updated = 0;

    for (const setting of r2Settings) {
      const existing = await SystemSetting.findOne({
        where: { setting_key: setting.key }
      });

      if (existing) {
        // Only update if value is provided and different
        if (setting.value && existing.value !== setting.value) {
          await existing.update({
            value: setting.value,
            description: setting.description,
            category: setting.category,
            is_encrypted: setting.is_encrypted
          });
          updated++;
          console.log(`   ✅ Updated: ${setting.key}`);
        } else {
          console.log(`   ⚠️  Skipped: ${setting.key} (already exists)`);
        }
      } else {
        // Create new setting
        await SystemSetting.create({
          setting_key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          is_encrypted: setting.is_encrypted
        });
        created++;
        console.log(`   ✅ Created: ${setting.key}`);
      }
    }

    console.log('');
    console.log(`✅ Initialization complete!`);
    console.log(`   Created: ${created} settings`);
    console.log(`   Updated: ${updated} settings`);
    console.log('');
    console.log('💡 You can update these settings in the Superadmin Dashboard > Settings > System > Cloudflare R2 Configuration');

  } catch (error) {
    console.error('❌ Error initializing R2 settings:', error);
    throw error;
  }
}

// Run the script
initializeR2Settings()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

