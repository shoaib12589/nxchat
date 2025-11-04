const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const AWS = require('aws-sdk');

// Cloudflare R2 Configuration
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: process.env.R2_REGION || 'auto',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

async function testFileUpload() {
  try {
    console.log('Testing file upload to R2...\n');

    // Create a test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Test avatar upload
    console.log('1. Uploading test avatar...');
    const avatarKey = 'avatars/test/1/test-avatar.png';
    await s3.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: avatarKey,
      Body: testImageBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }).promise();
    console.log('   ✅ Avatar uploaded successfully\n');

    // Test chat attachment upload
    console.log('2. Uploading test chat attachment...');
    const attachmentKey = 'attachments/test/123/test-attachment.png';
    await s3.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: attachmentKey,
      Body: testImageBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }).promise();
    console.log('   ✅ Attachment uploaded successfully\n');

    // Test file URL generation
    console.log('3. Generating file URLs...');
    const avatarUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: avatarKey,
      Expires: 3600
    });
    console.log(`   Avatar URL: ${avatarUrl}`);

    const attachmentUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: attachmentKey,
      Expires: 3600
    });
    console.log(`   Attachment URL: ${attachmentUrl}\n`);

    // Cleanup
    console.log('4. Cleaning up test files...');
    await s3.deleteObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: avatarKey
    }).promise();
    await s3.deleteObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: attachmentKey
    }).promise();
    console.log('   ✅ Test files deleted\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SUCCESS: File upload to R2 is working perfectly!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

testFileUpload();




