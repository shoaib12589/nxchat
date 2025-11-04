# Cloudflare R2 Storage Integration

## ✅ Configuration Complete

Your NxChat application is now fully integrated with Cloudflare R2 for storing user avatars and chat attachments.

## 📁 What Gets Stored in R2

### 1. User Avatars
- **Location**: `avatars/{tenant_id}/{user_id}/{unique_filename}.{ext}`
- **Endpoint**: `POST /api/uploads/avatar`
- **Allowed Types**: Images only (JPEG, PNG, GIF, WebP)
- **Max Size**: 10MB
- **Access**: Public

### 2. Chat Attachments
- **Location**: `attachments/{tenant_id}/{chat_id}/{unique_filename}.{ext}`
- **Endpoint**: `POST /api/uploads/chat-attachment`
- **Allowed Types**: Images, PDFs, Word docs, Excel files, text files
- **Max Size**: 10MB
- **Access**: Public

## 🔧 API Endpoints

### Upload Avatar
```typescript
const response = await apiClient.uploadAvatar(file);
// Response: { success: true, data: { url, filename, size } }
```

### Upload Chat Attachment
```typescript
const response = await apiClient.uploadChatAttachment(file, chatId, messageId?);
// Response: { success: true, data: { url, filename, size, type, message_type } }
```

### Delete File
```typescript
const response = await apiClient.deleteFile(fileUrl);
// Response: { success: true, message: 'File deleted successfully' }
```

## 🎯 Features

### Automatic URL Generation
- Files are stored with unique filenames (UUID-based)
- Public URLs are automatically generated
- Old avatars are deleted when new ones are uploaded

### File Organization
- Files are organized by tenant ID
- Chat attachments grouped by chat ID
- Easy to manage and clean up

### Error Handling
- Automatic failover to Wasabi if R2 fails
- Graceful error handling in all endpoints
- Detailed error messages

## 🔒 Security

- All uploads require authentication
- Files are validated before upload
- Only allowed file types are accepted
- File size limits enforced (10MB)

## 📊 Storage Usage Tracking

The system automatically tracks storage usage:
- `used_storage_bytes` field in `storage_providers` table
- Incremented on upload
- Decremented on delete

## 🧪 Testing

Run the test script to verify everything is working:
```bash
cd backend
node scripts/test-r2-connection.js
node scripts/test-file-upload.js
```

## 🚀 Usage Examples

### Frontend - Upload Avatar
```typescript
const fileInput = document.querySelector('#avatar-input');
const file = fileInput.files[0];

const response = await apiClient.uploadAvatar(file);
if (response.success) {
  console.log('Avatar uploaded:', response.data.url);
  // Update user avatar in UI
}
```

### Frontend - Upload Chat Attachment
```typescript
const fileInput = document.querySelector('#file-input');
const file = fileInput.files[0];

const response = await apiClient.uploadChatAttachment(file, chatId);
if (response.success) {
  console.log('Attachment uploaded:', response.data.url);
  // Send message with attachment
  match.sendMessage({
    chat_id: chatId,
    message: 'Check this out!',
    file_url: response.data.url,
    file_name: response.data.filename,
    file_size: response.data.size,
    message_type: response.data.message_type
  });
}
```

## 📝 Configuration

All configuration is stored in `.env`:

```env
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=nxchat
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

## 🎉 Summary

- ✅ R2 connection tested and working
- ✅ Storage provider configured in database
- ✅ Upload endpoints created and registered
- ✅ API client methods added
- ✅ File organization implemented
- ✅ Error handling in place
- ✅ Storage usage tracking enabled

Your application is ready to store all user avatars and chat attachments in Cloudflare R2!




