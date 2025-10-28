const AWS = require('aws-sdk');
const { StorageProvider } = require('../models');

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
    const provider = await StorageProvider.findOne({
      where: { is_active: true }
    });

    if (!provider) {
      throw new Error('No active storage provider found');
    }

    return provider;
  } catch (error) {
    console.error('Error getting active storage provider:', error);
    throw error;
  }
};

// Upload file to storage
const uploadFile = async (key, buffer, contentType) => {
  try {
    const provider = await getActiveProvider();
    const s3 = configureAWS(provider);

    const params = {
      Bucket: provider.bucket_name,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();

    // Update storage usage
    await provider.increment('used_storage_bytes', buffer.length);

    // Return CDN URL if configured
    const cdnUrl = process.env.CDN_URL || '';
    if (cdnUrl) {
      return `${cdnUrl}/${key}`;
    }

    return result.Location;
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Retry with exponential backoff if R2 fails
    if (provider.provider_name === 'r2' && error.code !== 'ENOENT') {
      console.log('R2 upload failed, attempting failover to Wasabi...');
      const wasabiProvider = await StorageProvider.findOne({
        where: { provider_name: 'wasabi', is_active: false }
      });
      
      if (wasabiProvider) {
        try {
          wasabiProvider.is_active = true;
          await wasabiProvider.save();
          provider.is_active = false;
          await provider.save();
          
          return await uploadFile(key, buffer, contentType);
        } catch (retryError) {
          console.error('Failover upload failed:', retryError);
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
    const cdnUrl = process.env.CDN_URL;
    
    // If CDN is configured, return CDN URL
    if (cdnUrl) {
      return `${cdnUrl}/${key}`;
    }
    
    const provider = await getActiveProvider();
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
    
    return new Promise((resolve, reject) => {
      stream.pipe(s3Stream)
        .on('error', reject)
        .on('complete', (result) => {
          const cdnUrl = process.env.CDN_URL || '';
          const url = cdnUrl ? `${cdnUrl}/${key}` : result.Location;
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