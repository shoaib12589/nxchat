/**
 * Script to test R2 upload functionality
 * Run: node scripts/test-r2-upload.js
 */

const { sequelize } = require('../config/database');
const { SystemSetting, StorageProvider } = require('../models');
const { uploadFile } = require('../services/storageService');
require('dotenv').config();

async function testR2Upload() {
  try {
    console.log('🔍 Testing R2 Upload Configuration...\n');

    // Check default storage provider
    const defaultProviderSetting = await SystemSetting.findOne({
      where: { setting_key: 'default_storage_provider' }
    });
    console.log('1. Default Storage Provider Setting:');
    console.log(`   Value: ${defaultProviderSetting?.value || 'Not set (defaults to r2)'}\n`);

    // Check R2 settings
    const r2Settings = await SystemSetting.findAll({
      where: {
        setting_key: {
          [require('sequelize').Op.in]: [
            'r2_access_key_id',
            'r2_secret_access_key',
            'r2_bucket_name',
            'r2_endpoint',
            'r2_region',
            'r2_public_url'
          ]
        }
      }
    });

    console.log('2. R2 Configuration from System Settings:');
    const r2Config = {};
    r2Settings.forEach(setting => {
      const value = setting.setting_key.includes('key') || setting.setting_key.includes('secret')
        ? (setting.value ? '***' + setting.value.slice(-4) : 'Not set')
        : setting.value || 'Not set';
      console.log(`   ${setting.setting_key}: ${value}`);
      r2Config[setting.setting_key] = setting.value;
    });
    console.log('');

    // Check if all required fields are present
    const hasAllFields = r2Config.r2_access_key_id && 
                        r2Config.r2_secret_access_key && 
                        r2Config.r2_bucket_name && 
                        r2Config.r2_endpoint;
    
    console.log('3. Configuration Status:');
    console.log(`   All required fields present: ${hasAllFields ? '✅ Yes' : '❌ No'}`);
    if (!hasAllFields) {
      console.log('   Missing fields:');
      if (!r2Config.r2_access_key_id) console.log('     - r2_access_key_id');
      if (!r2Config.r2_secret_access_key) console.log('     - r2_secret_access_key');
      if (!r2Config.r2_bucket_name) console.log('     - r2_bucket_name');
      if (!r2Config.r2_endpoint) console.log('     - r2_endpoint');
    }
    console.log('');

    // Check storage provider in database
    console.log('4. Storage Provider in Database:');
    const r2Provider = await StorageProvider.findOne({
      where: { provider_name: 'r2' }
    });
    if (r2Provider) {
      console.log(`   ✅ R2 Provider exists (ID: ${r2Provider.id})`);
      console.log(`   Display Name: ${r2Provider.display_name}`);
      console.log(`   Bucket: ${r2Provider.bucket_name}`);
      console.log(`   Endpoint: ${r2Provider.endpoint}`);
      console.log(`   Is Active: ${r2Provider.is_active}`);
      console.log(`   Is Default: ${r2Provider.is_default}`);
    } else {
      console.log('   ⚠️  R2 Provider not found in database');
    }
    console.log('');

    // Test upload if all fields are present
    if (hasAllFields) {
      console.log('5. Testing File Upload:');
      try {
        const testBuffer = Buffer.from('NxChat R2 Upload Test');
        const testKey = `test/uploads/${Date.now()}-test.txt`;
        
        console.log(`   Uploading test file: ${testKey}`);
        const fileUrl = await uploadFile(testKey, testBuffer, 'text/plain');
        console.log(`   ✅ Upload successful!`);
        console.log(`   File URL: ${fileUrl}`);
      } catch (uploadError) {
        console.error(`   ❌ Upload failed: ${uploadError.message}`);
        console.error(`   Error code: ${uploadError.code || 'N/A'}`);
        if (uploadError.stack) {
          console.error(`   Stack: ${uploadError.stack}`);
        }
      }
    } else {
      console.log('5. Skipping upload test (missing required fields)');
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testR2Upload();

