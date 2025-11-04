const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantAuth');
const { uploadFile, deleteFile } = require('../services/storageService');
const { User, Message } = require('../models');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure directory exists
function ensureDirSync(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload avatar (for profile pictures)
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    // Validate image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'File must be an image'
      });
    }

    // Generate unique file name
    const fileExt = path.extname(req.file.originalname);
    const fileName = `avatars/${tenantId}/${userId}/${uuidv4()}${fileExt}`;

    // Upload to R2
    const fileUrl = await uploadFile(fileName, req.file.buffer, req.file.mimetype);

    // Update user's avatar in database
    const user = await User.findByPk(userId);
    
    // Delete old avatar if exists
    if (user.avatar && user.avatar.includes('avatars/')) {
      const oldFileName = user.avatar.split('/').slice(-3).join('/'); // Get the key part
      try {
        await deleteFile(oldFileName);
      } catch (err) {
        console.warn('Failed to delete old avatar:', err.message);
      }
    }
    
    user.avatar = fileUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
});

// Upload chat attachment
router.post('/chat-attachment', authenticateToken, requireTenant, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { chat_id, message_id } = req.body;

    if (!chat_id) {
      return res.status(400).json({
        success: false,
        message: 'chat_id is required'
      });
    }

    // Generate unique file name
    const fileExt = path.extname(req.file.originalname);
    const fileName = `attachments/${tenantId}/${chat_id}/${uuidv4()}${fileExt}`;

    // Upload to R2
    const fileUrl = await uploadFile(fileName, req.file.buffer, req.file.mimetype);

    // If message_id is provided, update the message with the file
    if (message_id) {
      const message = await Message.findByPk(message_id);
      if (message) {
        message.file_url = fileUrl;
        message.file_name = req.file.originalname;
        message.file_size = req.file.size;
        message.message_type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
        await message.save();
      }
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        message_type: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
      }
    });
  } catch (error) {
    console.error('Chat attachment upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

// Delete file
router.delete('/file', authenticateToken, requireTenant, async (req, res) => {
  try {
    const { file_url } = req.body;

    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: 'file_url is required'
      });
    }

    // Extract the key from the URL
    const urlObj = new URL(file_url);
    const fileName = urlObj.pathname.startsWith('/') 
      ? urlObj.pathname.substring(1) 
      : urlObj.pathname;

    await deleteFile(fileName);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

module.exports = router;


// Local agent image upload with strict limits
router.post('/agent-image', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'File must be an image' });
    }

    // Enforce 200KB max (after client-side resize/compression)
    const MAX_BYTES = 200 * 1024;
    if (req.file.size > MAX_BYTES) {
      return res.status(400).json({ success: false, message: 'Image must be smaller than 200KB' });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenant_id || 'global';

    // Build local path under public/agent_images
    const publicRoot = path.join(__dirname, '../public');
    const baseDir = path.join(publicRoot, 'agent_images', String(tenantId));
    ensureDirSync(baseDir);

    const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase();
    const fileBase = `${userId}_${uuidv4()}${ext}`;
    const fullPath = path.join(baseDir, fileBase);

    // Write buffer to disk
    fs.writeFileSync(fullPath, req.file.buffer);

    // Build public URL (served by /public)
    const publicUrl = `${req.protocol}://${req.get('host')}/public/agent_images/${tenantId}/${fileBase}`;

    // Update user avatar
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.avatar = publicUrl;
    await user.save();

    return res.json({
      success: true,
      message: 'Agent image uploaded successfully',
      data: {
        url: publicUrl,
        filename: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Agent image upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload agent image' });
  }
});


