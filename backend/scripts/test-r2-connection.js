const AWS = require('aws-sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Cloudflare R2 Configuration
const R2_CONFIG = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION || 'auto'
};

console.log('Testing Cloudflare R2 Connection...\n');
console.log('Configuration:');
console.log('- Endpoint:', R2_CONFIG.endpoint);
console.log('- Bucket:', R2_CONFIG.bucketName);
console.log('- Region:', R2_CONFIG.region);
console.log('- Access Key:', R2_CONFIG.accessKeyId ? `${R2_CONFIG.accessKeyId.substr(0, 10)}...` : 'NOT SET');
console.log('- Secret Key:', R2_CONFIG.secretAccessKey ? 'SET ✓' : 'NOT SET');
console.log('');

// Validate configuration
if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
  console.error('❌ ERROR: Missing R2 credentials in .env file');
  console.error('Please ensure R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are set');
  process.exit(1);
}

if (!R2_CONFIG.endpoint || !R2_CONFIG.bucketName) {
  console.error('❌ ERROR: Missing R2 configuration in .env file');
  console.error('Please ensure R2_ENDPOINT and R2_BUCKET_NAME are set');
  process.exit(1);
}

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: R2_CONFIG.endpoint,
  accessKeyId: R2_CONFIG.accessKeyId,
  secretAccessKey: R2_CONFIG.secretAccessKey,
  region: R2_CONFIG.region,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Test connection
async function testConnection() {
  try {
    console.log('1. Testing bucket access...');
    const bucketCheck = await s3.headBucket({ Bucket: R2_CONFIG.bucketName }).promise();
    console.log('   ✅ Bucket exists and is accessible\n');

    console.log('2. Listing objects in bucket...');
    const listResult = await s3.listObjectsV2({ 
      Bucket: R2_CONFIG.bucketName,
      MaxKeys: 5 
    }).promise();
    console.log(`   ✅ Found ${listResult.KeyCount || 0} objects in bucket\n`);

    console.log('3. Testing file upload...');
    const testContent = Buffer.from('Hello from NxChat!');
    const testKey = `test/${Date.now()}-test.txt`;
    
    const uploadResult = await s3.putObject({
      Bucket: R2_CONFIG.bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('   ✅ Test file uploaded successfully');
    console.log(`   File Key: ${testKey}\n`);

    console.log('4. Testing file download...');
    const downloadResult = await s3.getObject({
      Bucket: R2_CONFIG.bucketName,
      Key: testKey
    }).promise();
    
    const downloadedContent = downloadResult.Body.toString();
    console.log('   ✅ Test file downloaded successfully');
    console.log(`   Content: ${downloadedContent}\n`);

    console.log('5. Cleaning up test file...');
    await s3.deleteObject({
      Bucket: R2_CONFIG.bucketName,
      Key: testKey
    }).promise();
    console.log('   ✅ Test file deleted\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SUCCESS: Cloudflare R2 connection is working!');
    console.log('═══════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR: Failed to connect to Cloudflare R2');
    console.error('═══════════════════════════════════════════════════');
    console.error('Error Details:');
    console.error('- Error Code:', error.code);
    console.error('- Error Message:', error.message);
    console.error('- Error Stack:', error.stack);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.error('\n💡 Suggestion: Check your R2_ACCESS_KEY_ID in .env file');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Suggestion: Check your R2_SECRET_ACCESS_KEY in .env file');
    } else if (error.code === 'NoSuchBucket') {
      console.error('\n💡 Suggestion: Check your R2_BUCKET_NAME and ensure the bucket exists');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Suggestion: Check your R2_ENDPOINT and ensure it\'s correct');
    }
    
    process.exit(1);
  }
}

testConnection();

