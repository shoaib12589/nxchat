const AWS = require('aws-sdk');
const { StorageProvider, SystemSetting } = require('../models');
const { Op } = require('sequelize');

// Configure AWS SDK
const configureAWS = (provider) => {
  AWS.config.update({
    accessKeyId: provider.access_key,
    secretAccessKey: provider.secret_key,
    region: provider.region
  });

  if (provider.provider_name === 'r2') {
    return new AWS.S3({
      endpoint: provider.endpoint,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    });
  } else if (provider.provider_name === 'wasabi') {
    return new AWS.S3({
      endpoint: provider.endpoint,
      s3ForcePathStyle: true
    });
  } else {
    return new AWS.S3();
  }
};

// Get active storage provider
const getActiveProvider = async () => {
  try {
    // Check for default storage provider setting
    const defaultProviderSetting = await SystemSetting.findOne({
      where: { setting_key: 'default_storage_provider' }
    });

    const defaultProviderName = defaultProviderSetting?.value || 'r2'; // Default to R2 if not set
    console.log('🔍 Default storage provider setting:', defaultProviderName);

    // First, try to get R2 configuration from system settings
    const r2Settings = await SystemSetting.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'r2_access_key_id',
            'r2_secret_access_key',
            'r2_bucket_name',
            'r2_endpoint',
            'r2_region'
          ]
        }
      }
    });

    // Convert settings array to object
    const r2Config = {};
    r2Settings.forEach(setting => {
      r2Config[setting.setting_key] = setting.value;
    });

    console.log('🔍 R2 Configuration check:', {
      hasAccessKey: !!r2Config.r2_access_key_id,
      hasSecretKey: !!r2Config.r2_secret_access_key,
      hasBucketName: !!r2Config.r2_bucket_name,
      hasEndpoint: !!r2Config.r2_endpoint,
      defaultProvider: defaultProviderName
    });

    // If default provider is R2 and R2 is configured in system settings, use it
    if (defaultProviderName === 'r2' && r2Config.r2_access_key_id && r2Config.r2_secret_access_key && 
        r2Config.r2_bucket_name && r2Config.r2_endpoint) {
      
      console.log('✅ Using R2 from system settings');
      
      // Check if R2 provider exists in database, create or update it
      let r2Provider = await StorageProvider.findOne({
        where: { provider_name: 'r2' }
      });

      if (r2Provider) {
        // Update existing R2 provider with new credentials
        console.log('📝 Updating existing R2 provider in database');
        await r2Provider.update({
          access_key: r2Config.r2_access_key_id,
          secret_key: r2Config.r2_secret_access_key,
          bucket_name: r2Config.r2_bucket_name,
          endpoint: r2Config.r2_endpoint,
          region: r2Config.r2_region || 'auto',
          is_active: true
        });
      } else {
        // Create new R2 provider
        console.log('➕ Creating new R2 provider in database');
        r2Provider = await StorageProvider.create({
          provider_name: 'r2',
          access_key: r2Config.r2_access_key_id,
          secret_key: r2Config.r2_secret_access_key,
          bucket_name: r2Config.r2_bucket_name,
          endpoint: r2Config.r2_endpoint,
          region: r2Config.r2_region || 'auto',
          is_active: true,
          is_default: true
        });
      }

      console.log('✅ R2 provider ready:', {
        id: r2Provider.id,
        bucket: r2Provider.bucket_name,
        endpoint: r2Provider.endpoint
      });

      return r2Provider;
    }

    // If default provider is set to something other than R2, or R2 not configured, use database storage provider
    // Try to get the provider specified in default_storage_provider setting
    if (defaultProviderName && defaultProviderName !== 'r2') {
      console.log('🔍 Looking for provider:', defaultProviderName);
      const provider = await StorageProvider.findOne({
        where: { 
          provider_name: defaultProviderName,
          is_active: true 
        }
      });

      if (provider) {
        console.log('✅ Using provider from database:', provider.provider_name);
        return provider;
      } else {
        console.warn('⚠️ Provider not found in database:', defaultProviderName);
      }
    }

    // Fallback to any active storage provider
    console.log('🔍 Falling back to any active storage provider');
    const provider = await StorageProvider.findOne({
      where: { is_active: true },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    if (!provider) {
      console.error('❌ No active storage provider found');
      throw new Error('No active storage provider found. Please configure R2 in Superadmin Settings or set up a storage provider in the database.');
    }

    console.log('✅ Using fallback provider:', provider.provider_name);
    return provider;
  } catch (error) {
    console.error('❌ Error getting active storage provider:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};

// Upload file to storage
const uploadFile = async (key, buffer, contentType) => {
  let provider = null;
  try {
    console.log('📤 Starting file upload:', { key, contentType, size: buffer.length });
    
    provider = await getActiveProvider();
    console.log('✅ Using storage provider:', {
      name: provider.provider_name,
      bucket: provider.bucket_name,
      endpoint: provider.endpoint
    });
    
    const s3 = configureAWS(provider);

    const params = {
      Bucket: provider.bucket_name,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    };

    console.log('📤 Uploading to:', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType
    });

    const result = await s3.upload(params).promise();
    console.log('✅ Upload successful, S3 result:', result.Location);

    // Update storage usage (reload provider to get fresh instance)
    try {
      const providerInstance = await StorageProvider.findByPk(provider.id);
      if (providerInstance) {
        await providerInstance.increment('used_storage_bytes', { by: buffer.length });
        console.log('✅ Storage usage updated');
      }
    } catch (usageError) {
      console.warn('⚠️ Failed to update storage usage:', usageError.message);
      // Don't fail the upload if usage tracking fails
    }

    // Get R2 public URL from system settings (preferred) or environment variable
    let publicUrl = '';
    if (provider.provider_name === 'r2') {
      try {
        const r2PublicUrlSetting = await SystemSetting.findOne({
          where: { setting_key: 'r2_public_url' }
        });
        if (r2PublicUrlSetting && r2PublicUrlSetting.value) {
          publicUrl = r2PublicUrlSetting.value.trim();
          // Ensure URL ends with / if not empty
          if (publicUrl && !publicUrl.endsWith('/')) {
            publicUrl += '/';
          }
        }
      } catch (error) {
        console.warn('Failed to get R2 public URL from settings:', error.message);
      }
    }

    // Fallback to CDN_URL env variable if R2 public URL not configured
    if (!publicUrl) {
      publicUrl = process.env.CDN_URL || '';
    }

    // If public URL is configured, use it
    if (publicUrl) {
      const finalUrl = `${publicUrl}${key}`;
      console.log('✅ Final file URL:', finalUrl);
      return finalUrl;
    }

    // Otherwise return the S3 location
    console.log('✅ Returning S3 location:', result.Location);
    return result.Location;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Retry with exponential backoff if R2 fails
    if (provider && provider.provider_name === 'r2' && error.code !== 'ENOENT') {
      console.log('⚠️ R2 upload failed, attempting failover to Wasabi...');
      const wasabiProvider = await StorageProvider.findOne({
        where: { provider_name: 'wasabi', is_active: false }
      });
      
      if (wasabiProvider) {
        try {
          wasabiProvider.is_active = true;
          await wasabiProvider.save();
          if (provider) {
            provider.is_active = false;
            await provider.save();
          }
          
          return await uploadFile(key, buffer, contentType);
        } catch (retryError) {
          console.error('❌ Failover upload failed:', retryError);
          throw error; // Throw original error
        }
      }
    }
    
    throw error;
  }
};

// Delete file from storage
const deleteFile = async (key) => {
  try {
    const provider = await getActiveProvider();
    const s3 = configureAWS(provider);

    const params = {
      Bucket: provider.bucket_name,
      Key: key
    };

    // Get file size before deletion
    try {
      const headResult = await s3.headObject(params).promise();
      const fileSize = headResult.ContentLength;

      await s3.deleteObject(params).promise();

      // Update storage usage
      await provider.decrement('used_storage_bytes', fileSize);
    } catch (headError) {
      // File might not exist, just delete
      await s3.deleteObject(params).promise();
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Get file URL
const getFileUrl = async (key) => {
  try {
    const provider = await getActiveProvider();
    
    // Get R2 public URL from system settings (preferred) or environment variable
    let publicUrl = '';
    if (provider.provider_name === 'r2') {
      try {
        const r2PublicUrlSetting = await SystemSetting.findOne({
          where: { setting_key: 'r2_public_url' }
        });
        if (r2PublicUrlSetting && r2PublicUrlSetting.value) {
          publicUrl = r2PublicUrlSetting.value.trim();
          if (publicUrl && !publicUrl.endsWith('/')) {
            publicUrl += '/';
          }
        }
      } catch (error) {
        console.warn('Failed to get R2 public URL from settings:', error.message);
      }
    }

    // Fallback to CDN_URL env variable if R2 public URL not configured
    if (!publicUrl) {
      publicUrl = process.env.CDN_URL || '';
    }
    
    // If public URL is configured, return public URL
    if (publicUrl) {
      return `${publicUrl}${key}`;
    }
    
    // Otherwise generate signed URL
    const s3 = configureAWS(provider);
    const params = {
      Bucket: provider.bucket_name,
      Key: key,
      Expires: 3600 // 1 hour
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

// Generate presigned URL for direct client uploads
const generatePresignedUploadUrl = async (key, contentType, maxSize = 5242880) => {
  try {
    const provider = await getActiveProvider();
    const s3 = configureAWS(provider);

    const params = {
      Bucket: provider.bucket_name,
      Key: key,
      ContentType: contentType,
      Expires: 3600, // 1 hour
      Conditions: [
        ['content-length-range', 0, maxSize]
      ]
    };

    return s3.createPresignedPost(params);
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    throw error;
  }
};

// Stream upload (for large files)
const uploadFileStream = async (key, contentType, stream) => {
  try {
    const provider = await getActiveProvider();
    const s3 = configureAWS(provider);

    const uploadParams = {
      Bucket: provider.bucket_name,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read'
    };

    const s3Stream = s3.upload(uploadParams);
    
    return new Promise(async (resolve, reject) => {
      stream.pipe(s3Stream)
        .on('error', reject)
        .on('complete', async (result) => {
          // Get R2 public URL from system settings (preferred) or environment variable
          let publicUrl = '';
          if (provider.provider_name === 'r2') {
            try {
              const r2PublicUrlSetting = await SystemSetting.findOne({
                where: { setting_key: 'r2_public_url' }
              });
              if (r2PublicUrlSetting && r2PublicUrlSetting.value) {
                publicUrl = r2PublicUrlSetting.value.trim();
                if (publicUrl && !publicUrl.endsWith('/')) {
                  publicUrl += '/';
                }
              }
            } catch (error) {
              console.warn('Failed to get R2 public URL from settings:', error.message);
            }
          }

          // Fallback to CDN_URL env variable if R2 public URL not configured
          if (!publicUrl) {
            publicUrl = process.env.CDN_URL || '';
          }

          // If public URL is configured, use it
          const url = publicUrl ? `${publicUrl}${key}` : result.Location;
          resolve(url);
        });
    });
  } catch (error) {
    console.error('Error streaming upload:', error);
    throw error;
  }
};

// List files
const listFiles = async (prefix = '') => {
  try {
    const provider = await getActiveProvider();
    const s3 = configureAWS(provider);

    const params = {
      Bucket: provider.bucket_name,
      Prefix: prefix
    };

    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

// Get storage usage
const getStorageUsage = async () => {
  try {
    const provider = await getActiveProvider();
    
    return {
      used: provider.used_storage_bytes,
      quota: provider.max_storage_gb ? provider.max_storage_gb * 1024 * 1024 * 1024 : null,
      percentage: provider.max_storage_gb ? 
        (provider.used_storage_bytes / (provider.max_storage_gb * 1024 * 1024 * 1024)) * 100 : null
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    throw error;
  }
};

// Create storage provider
const createProvider = async (providerData) => {
  try {
    const provider = await StorageProvider.create(providerData);
    return provider;
  } catch (error) {
    console.error('Error creating storage provider:', error);
    throw error;
  }
};

// Update storage provider
const updateProvider = async (id, providerData) => {
  try {
    const provider = await StorageProvider.findByPk(id);
    if (!provider) {
      throw new Error('Storage provider not found');
    }

    await provider.update(providerData);
    return provider;
  } catch (error) {
    console.error('Error updating storage provider:', error);
    throw error;
  }
};

// Delete storage provider
const deleteProvider = async (id) => {
  try {
    const provider = await StorageProvider.findByPk(id);
    if (!provider) {
      throw new Error('Storage provider not found');
    }

    await provider.destroy();
    return true;
  } catch (error) {
    console.error('Error deleting storage provider:', error);
    throw error;
  }
};

// Get all storage providers
const getAllProviders = async () => {
  try {
    const providers = await StorageProvider.findAll({
      order: [['created_at', 'DESC']]
    });
    return providers;
  } catch (error) {
    console.error('Error getting storage providers:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl,
  generatePresignedUploadUrl,
  uploadFileStream,
  listFiles,
  getStorageUsage,
  createProvider,
  updateProvider,
  deleteProvider,
  getAllProviders
};