const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { authenticateToken, requireCompanyAdmin } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantAuth');
const { AITrainingDoc } = require('../models');
const aiService = require('../services/aiService');
const storageService = require('../services/storageService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
    }
  }
});

// Upload training document
router.post('/upload', authenticateToken, requireCompanyAdmin, requireTenant, upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, description, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let extractedText = '';
    let fileType = 'text';

    // Extract text based on file type
    try {
      if (file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
        fileType = 'pdf';
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = docxData.value;
        fileType = 'docx';
      } else if (file.mimetype === 'text/plain') {
        extractedText = file.buffer.toString('utf-8');
        fileType = 'txt';
      }
    } catch (extractError) {
      console.error('Text extraction error:', extractError);
      return res.status(500).json({ success: false, message: 'Failed to extract text from file' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ success: false, message: 'No text content found in file' });
    }

    // Process text with AI service for better structure
    let processedContent = extractedText;
    try {
      processedContent = await aiService.processTrainingDocument(extractedText, file.originalname);
    } catch (aiError) {
      console.warn('AI processing failed, using raw text:', aiError.message);
    }

    // Upload file to storage
    let fileUrl = null;
    try {
      const uploadResult = await storageService.uploadFile(file, {
        folder: `training-docs/${tenantId}`,
        makePublic: false
      });
      fileUrl = uploadResult.url;
    } catch (storageError) {
      console.warn('File storage failed, saving without file URL:', storageError.message);
    }

    // Save training document to database
    const trainingDoc = await AITrainingDoc.create({
      tenant_id: tenantId,
      name: name || file.originalname,
      description: description || '',
      content: processedContent,
      file_type: fileType,
      file_url: fileUrl,
      file_size: file.size,
      category: category || 'general',
      uploaded_by: req.user.id,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Training document uploaded successfully',
      data: trainingDoc
    });
  } catch (error) {
    console.error('Upload training document error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload training document' });
  }
});

// Create text-based training document
router.post('/create-text', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, description, content, category } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Process content with AI service
    let processedContent = content;
    try {
      processedContent = await aiService.processTrainingDocument(content, name || 'Manual Entry');
    } catch (aiError) {
      console.warn('AI processing failed, using raw content:', aiError.message);
    }

    const trainingDoc = await AITrainingDoc.create({
      tenant_id: tenantId,
      name: name || 'Manual Training Document',
      description: description || '',
      content: processedContent,
      file_type: 'text',
      category: category || 'general',
      uploaded_by: req.user.id,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Training document created successfully',
      data: trainingDoc
    });
  } catch (error) {
    console.error('Create text training document error:', error);
    res.status(500).json({ success: false, message: 'Failed to create training document' });
  }
});

// Get all training documents
router.get('/', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { tenant_id: tenantId };
    if (category) {
      whereClause.category = category;
    }

    const { count, rows: documents } = await AITrainingDoc.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get training documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training documents' });
  }
});

// Get single training document
router.get('/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Training document not found' });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get training document error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training document' });
  }
});

// Update training document
router.put('/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { name, description, content, category, is_active } = req.body;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Training document not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content) {
      // Reprocess content with AI if provided
      try {
        updateData.content = await aiService.processTrainingDocument(content, name || document.name);
      } catch (aiError) {
        updateData.content = content;
      }
    }
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    await document.update(updateData);

    res.json({
      success: true,
      message: 'Training document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Update training document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update training document' });
  }
});

// Delete training document
router.delete('/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Training document not found' });
    }

    // Delete file from storage if exists
    if (document.file_url) {
      try {
        await storageService.deleteFile(document.file_url);
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError.message);
      }
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Training document deleted successfully'
    });
  } catch (error) {
    console.error('Delete training document error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete training document' });
  }
});

// Get AI usage statistics
router.get('/stats/usage', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period = 'month' } = req.query;

    const stats = await aiService.getUsageStats(tenantId, period);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get AI usage stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI usage statistics' });
  }
});

// Test AI response with training documents
router.post('/test-ai', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const response = await aiService.generateChatbotResponse(message, { tenant_id: tenantId });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Test AI response error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI response' });
  }
});

// Bulk upload training documents
router.post('/bulk-upload', authenticateToken, requireCompanyAdmin, requireTenant, upload.array('files', 10), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const files = req.files;
    const { category } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        let extractedText = '';
        let fileType = 'text';

        // Extract text based on file type
        if (file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(file.buffer);
          extractedText = pdfData.text;
          fileType = 'pdf';
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const docxData = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = docxData.value;
          fileType = 'docx';
        } else if (file.mimetype === 'text/plain') {
          extractedText = file.buffer.toString('utf-8');
          fileType = 'txt';
        }

        if (!extractedText.trim()) {
          errors.push({ file: file.originalname, error: 'No text content found' });
          continue;
        }

        // Process text with AI service
        let processedContent = extractedText;
        try {
          processedContent = await aiService.processTrainingDocument(extractedText, file.originalname);
        } catch (aiError) {
          console.warn(`AI processing failed for ${file.originalname}:`, aiError.message);
        }

        // Upload file to storage
        let fileUrl = null;
        try {
          const uploadResult = await storageService.uploadFile(file, {
            folder: `training-docs/${tenantId}`,
            makePublic: false
          });
          fileUrl = uploadResult.url;
        } catch (storageError) {
          console.warn(`File storage failed for ${file.originalname}:`, storageError.message);
        }

        // Save training document
        const trainingDoc = await AITrainingDoc.create({
          tenant_id: tenantId,
          name: file.originalname,
          description: '',
          content: processedContent,
          file_type: fileType,
          file_url: fileUrl,
          file_size: file.size,
          category: category || 'general',
          uploaded_by: req.user.id,
          is_active: true
        });

        results.push(trainingDoc);
      } catch (fileError) {
        errors.push({ file: file.originalname, error: fileError.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} files successfully`,
      data: {
        successful: results,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process bulk upload' });
  }
});

module.exports = router;
