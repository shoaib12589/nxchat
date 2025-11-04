const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { WidgetSetting, Visitor, VisitorMessage, VisitorActivity, SystemSetting, WidgetKey, Company, Plan, BannedIP } = require('../models');
const aiService = require('../services/aiService');
const { isIPBanned } = require('../services/bannedIPCache');
const { uploadFile } = require('../services/storageService');
const { v4: uuidv4 } = require('uuid');

// Configure multer for visitor file uploads (store in memory)
const visitorUpload = multer({
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

// Handle preflight OPTIONS requests for CORS
router.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

// Serve widget JavaScript file
router.get('/nxchat-widget.js', (req, res) => {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.sendFile(path.join(__dirname, '../public/nxchat-widget.js'));
});

// Zendesk-style snippet.js endpoint
router.get('/snippet.js', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).send('Missing key parameter');
    }

    // Validate key format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key)) {
      return res.status(400).send('Invalid key format');
    }

    // Find the widget key and get tenant ID and brand ID
    const widgetKey = await WidgetKey.findOne({
      where: { 
        key: key,
        is_active: true 
      },
      include: [
        {
          model: require('../models').Brand,
          as: 'brand',
          attributes: ['id', 'name', 'primary_color', 'secondary_color', 'logo']
        }
      ]
    });


    if (!widgetKey) {
      return res.status(404).send('Invalid widget key');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Read the widget JavaScript file
    const fs = require('fs');
    const widgetPath = path.join(__dirname, '../public/nxchat-widget.js');
    let widgetCode = fs.readFileSync(widgetPath, 'utf8');
    
    // Safely sanitize brand data to prevent syntax errors
    const safeBrandName = widgetKey.brand ? (widgetKey.brand.name || '').replace(/['"\\]/g, '') : '';
    
    // Handle brand logo safely - temporarily disable to fix syntax error
    let safeBrandLogo = '';
    // TODO: Fix brand logo data corruption issue
    
    const safePrimaryColor = widgetKey.brand ? (widgetKey.brand.primary_color || '#007bff').replace(/['"\\]/g, '') : '#007bff';
    const safeSecondaryColor = widgetKey.brand ? (widgetKey.brand.secondary_color || '#6c757d').replace(/['"\\]/g, '') : '#6c757d';
    
    // Inject tenant ID, brand ID and security configuration
    const injectedCode = `(function() {
  // NxChat Widget Configuration
  window.NxChatTenantId = ${JSON.stringify(widgetKey.tenant_id)};
  window.NxChatBrandId = ${JSON.stringify(widgetKey.brand_id || null)};
  window.NxChatConfig = {
    tenantId: ${JSON.stringify(widgetKey.tenant_id)},
    brandId: ${JSON.stringify(widgetKey.brand_id || null)},
    brandName: ${JSON.stringify(safeBrandName)},
    brandColors: {
      primary: ${JSON.stringify(safePrimaryColor)},
      secondary: ${JSON.stringify(safeSecondaryColor)}
    },
    brandLogo: ${safeBrandLogo ? JSON.stringify(safeBrandLogo) : '""'},
    version: '1.0.0',
    timestamp: ${JSON.stringify(new Date().toISOString())}
  };
})();

` + widgetCode;

    // No minification to prevent syntax errors - skip comment removal to avoid breaking URLs
    // Comment removal can break URLs like http:// and https:// so we'll leave them intact
    const obfuscatedCode = injectedCode;

    // Validate the generated JavaScript before sending
    try {
      // Basic syntax validation - check for common issues
      if (obfuscatedCode.includes('undefined') && obfuscatedCode.includes('null')) {
        // Check for potential undefined/null concatenation issues
        const hasInvalidConcat = /undefined\s*\+\s*[^;]|null\s*\+\s*[^;]/.test(obfuscatedCode);
        if (hasInvalidConcat) {
          console.warn('Potential undefined/null concatenation detected in snippet.js');
        }
      }
      
      // Set proper content type
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(obfuscatedCode);
    } catch (validationError) {
      console.error('JavaScript validation error:', validationError);
      res.status(500).send('// Error generating widget code');
    }
  } catch (error) {
    console.error('Snippet.js error:', error);
    res.status(500).send('// Error generating widget code');
  }
});

// Get widget settings by tenant ID (public endpoint)
router.get('/settings/:tenantId', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { tenantId } = req.params;
    
    // Check company plan for AI access
    const company = await Company.findOne({
      where: { id: tenantId },
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'name', 'ai_enabled', 'features']
        }
      ]
    });
    
    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

    if (!widgetSettings) {
      // Return default settings if none found - AI enabled only if plan has it
      const hasAIInPlan = company?.plan?.ai_enabled === true;
      widgetSettings = {
        tenant_id: tenantId,
        theme_color: '#007bff',
        position: 'bottom-right',
        welcome_message: 'Hello! How can we help you today?',
        enable_audio: false,
        enable_video: false,
        enable_file_upload: true,
        ai_enabled: hasAIInPlan, // Only enable AI if plan has it
        ai_personality: 'friendly',
        auto_transfer_keywords: ['speak to human', 'agent', 'representative'],
        offline_message: 'We are currently offline. Please leave a message and we will get back to you soon.',
        custom_css: null,
        custom_js: null,
        notification_sound_enabled: true,
        notification_sound_file: 'default',
        notification_volume: 0.5,
        auto_maximize_on_message: true
      };
    } else {
      // Ensure AI is disabled if plan doesn't have it, even if widget settings has it enabled
      if (widgetSettings.ai_enabled && (!company || !company.plan || !company.plan.ai_enabled)) {
        widgetSettings.ai_enabled = false;
      }
    }

    // Get AI settings from system settings
    const { SystemSetting } = require('../models');
    const aiSettings = await SystemSetting.findAll({
      where: { category: 'ai' }
    });

    // Convert AI settings to object
    const aiSettingsObj = {};
    aiSettings.forEach(setting => {
      aiSettingsObj[setting.setting_key] = setting.value;
    });

    // Merge AI settings with widget settings
    const responseData = {
      ...widgetSettings.toJSON ? widgetSettings.toJSON() : widgetSettings,
      // Avoid hardcoded product names; default to a neutral label
      ai_agent_name: aiSettingsObj.ai_agent_name || 'AI Assistant',
      ai_agent_logo: aiSettingsObj.ai_agent_logo || '',
      ai_system_message: aiSettingsObj.ai_system_message || 'You are a helpful AI assistant for customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.'
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get widget settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch widget settings' });
  }
});

// Check agent availability for widget
router.get('/agent-availability/:tenantId', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { tenantId } = req.params;
    
    // Check if there are any online agents for this tenant
    const { User } = require('../models');
    const onlineAgents = await User.count({
      where: {
        tenant_id: tenantId,
        role: 'agent',
        status: 'active',
        agent_presence_status: 'online'
      }
    });

    res.json({
      success: true,
      data: {
        hasOnlineAgents: onlineAgents > 0,
        onlineAgentCount: onlineAgents
      }
    });
  } catch (error) {
    console.error('Check agent availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to check agent availability' });
  }
});

// Get online agents with avatars for widget
router.get('/online-agents/:tenantId', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { tenantId } = req.params;
    
    // Get online agents with avatars for this tenant
    const { User } = require('../models');
    const agents = await User.findAll({
      where: {
        tenant_id: tenantId,
        role: 'agent',
        status: 'active',
        agent_presence_status: 'online'
      },
      attributes: ['id', 'name', 'avatar'],
      limit: 3,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar
      }))
    });
  } catch (error) {
    console.error('Get online agents error:', error);
    res.status(500).json({ success: false, message: 'Failed to get online agents' });
  }
});

// Public: Get agent basic profile (id, name, avatar) by ID for widget
router.get('/agent/:agentId', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const { agentId } = req.params;
    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId is required' });
    }

    const { User } = require('../models');
    const agent = await User.findByPk(agentId, { attributes: ['id', 'name', 'avatar'] });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    return res.json({ success: true, data: { id: agent.id, name: agent.name, avatar: agent.avatar } });
  } catch (error) {
    console.error('Get widget agent error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent' });
  }
});

// AI Chat endpoint for widget
router.post('/chat/ai', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { message, tenantId, visitorId } = req.body;
    
    console.log('AI Chat request:', { message, tenantId, visitorId });
    
    if (!message || !tenantId || !visitorId) {
      console.log('Missing required fields:', { message: !!message, tenantId: !!tenantId, visitorId: !!visitorId });
      return res.status(400).json({ 
        success: false, 
        message: 'Message, tenantId, and visitorId are required' 
      });
    }

    // Check if AI is enabled for this tenant's subscription plan first
    const company = await Company.findOne({
      where: { id: tenantId },
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'name', 'ai_enabled', 'features']
        }
      ]
    });

    // Check if plan has AI enabled
    if (!company || !company.plan || !company.plan.ai_enabled) {
      return res.status(403).json({ 
        success: false, 
        message: 'AI chat is not available in your current plan. Please upgrade to access AI features.' 
      });
    }

    // Also check widget settings
    const widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

    console.log('Widget settings found:', { found: !!widgetSettings, aiEnabled: widgetSettings?.ai_enabled });

    if (!widgetSettings || !widgetSettings.ai_enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'AI chat is not enabled for this tenant' 
      });
    }

    // Check if OpenAI API key is configured
    const systemSetting = await SystemSetting.findOne({
      where: { setting_key: 'openai_api_key' }
    });

    if (!systemSetting || !systemSetting.value || systemSetting.value === 'your-openai-api-key-here') {
      return res.status(400).json({ 
        success: false, 
        message: 'OpenAI API key not configured. Please contact administrator.' 
      });
    }

    // Get visitor's brand for brand-specific AI training
    const visitor = await Visitor.findByPk(visitorId, {
      attributes: ['id', 'brand_id', 'tenant_id']
    });
    
    const brandId = visitor?.brand_id || null;
    console.log('Using brand-specific training:', { brandId, tenantId });

    // Generate AI response with brand-specific training
    console.log('Generating AI response...');
    const aiResponse = await aiService.generateResponse(message, '', tenantId, brandId);
    console.log('AI response generated:', { success: !!aiResponse, hasResponse: !!aiResponse?.response, isTransfer: aiResponse?.isTransferRequest });
    
    // Handle transfer request
    if (aiResponse?.isTransferRequest) {
      console.log('Transfer request detected, initiating transfer...');
      
      // Get visitor's brand
      const visitor = await Visitor.findByPk(visitorId, {
        attributes: ['id', 'brand_id', 'tenant_id']
      });
      
      if (!visitor || !visitor.brand_id) {
        console.log('Visitor or brand not found for transfer');
        return res.status(400).json({ 
          success: false, 
          message: 'Unable to transfer chat. Visitor brand not found.' 
        });
      }
      
      // Transfer to agent
      const transferService = require('../services/transferService');
      const transferResult = await transferService.transferChatToAgent(visitorId, tenantId, visitor.brand_id);
      
      if (!transferResult.success) {
        console.log('Transfer failed:', transferResult.message);
        return res.json({
          success: true,
          data: {
            response: transferResult.message,
            confidence: 0.9,
            tokens_used: 0,
            isTransferRequest: true,
            transferFailed: true
          }
        });
      }
      
      // Store transfer message in database
      try {
        const transferMessageRecord = await VisitorMessage.create({
          visitor_id: visitorId,
          tenant_id: tenantId,
          sender_type: 'system',
          sender_name: 'System',
          message: 'AI transferred this chat to agent pool. An agent will be with you shortly.',
          message_type: 'system',
          is_read: false,
          metadata: {
            transfer_type: 'ai_to_agent_pool'
          }
        });
        
        console.log('Transfer message stored in database:', transferMessageRecord.id);
      } catch (dbError) {
        console.error('Error storing transfer message in database:', dbError);
      }
      
      // Broadcast transfer notification to ALL online agents (not specific agent)
      const io = req.app.get('io');
      if (io) {
        const transferData = {
          visitorId: visitorId,
          tenantId: tenantId,
          message: 'Chat available for transfer - moved to agent pool',
          timestamp: new Date().toISOString(),
          type: 'ai_transfer_pool'
        };
        
        console.log('Broadcasting transfer notification to all agents:', transferData);
        
        // Get visitor's brand_id to emit to brand-specific room (all agents in that brand)
        const visitorData = await Visitor.findByPk(visitorId, { attributes: ['brand_id'] });
        if (visitorData && visitorData.brand_id) {
          // Broadcast to brand-specific room so ALL agents assigned to that brand receive it
          io.to(`brand_${visitorData.brand_id}`).emit('visitor:transfer', transferData);
          console.log(`Emitted visitor:transfer to brand room (all agents): brand_${visitorData.brand_id}`);
        } else {
          console.warn('Visitor has no brand_id, emitting to tenant room (all agents) as fallback');
          io.to(`tenant_${tenantId}`).emit('visitor:transfer', transferData);
        }
        
        // Also emit visitor update so UI refreshes
        const updatedVisitor = await Visitor.findByPk(visitorId, {
          include: [
            {
              model: require('../models').Brand,
              as: 'brand',
              attributes: ['id', 'name', 'primary_color'],
              required: false
            }
          ]
        });
        
        if (updatedVisitor) {
          const transformedVisitor = {
            id: updatedVisitor.id,
            name: updatedVisitor.name || 'Anonymous Visitor',
            email: updatedVisitor.email,
            phone: updatedVisitor.phone,
            avatar: updatedVisitor.avatar,
            status: updatedVisitor.status,
            assignedAgent: null,
            brand: updatedVisitor.brand,
            brandName: updatedVisitor.brand?.name || 'No Brand',
            last_activity: updatedVisitor.last_activity,
            created_at: updatedVisitor.created_at,
            updated_at: updatedVisitor.updated_at
          };
          
          io.to(`tenant_${tenantId}`).emit('visitor:update', transformedVisitor);
        }
      }
      
      return res.json({
        success: true,
        data: {
          response: aiResponse.response,
          confidence: aiResponse.confidence,
          tokens_used: aiResponse.tokens_used,
          isTransferRequest: true,
          transferSuccess: true,
          agent: null // No specific agent assigned
        }
      });
    }
    
    // Store AI response in database
    if (aiResponse?.response) {
      try {
        const aiMessageRecord = await VisitorMessage.create({
          visitor_id: visitorId,
          tenant_id: tenantId,
          sender_type: 'ai',
          sender_name: 'AI Assistant',
          message: aiResponse.response,
          message_type: 'text',
          is_read: false,
          metadata: {
            confidence: aiResponse.confidence,
            tokens_used: aiResponse.tokens_used,
            original_message: message
          }
        });
        
        console.log('AI response stored in database:', aiMessageRecord.id);
      } catch (dbError) {
        console.error('Error storing AI response in database:', dbError);
        // Continue execution even if database storage fails
      }
    }

    // Broadcast AI response to agents so they can see the conversation
    const io = req.app.get('io');
    if (io && aiResponse?.response) {
      const aiMessageData = {
        visitorId: visitorId,
        response: aiResponse.response,
        messageId: Date.now().toString(),
        timestamp: new Date().toISOString(),
        tenantId: tenantId
      };
      console.log('Broadcasting AI response to agents:', aiMessageData);
      io.emit('ai:response', aiMessageData);
    }
    
    res.json({
      success: true,
      data: {
        response: aiResponse.response,
        confidence: aiResponse.confidence,
        tokens_used: aiResponse.tokens_used
      }
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate AI response',
      error: error.message 
    });
  }
});

// Helper function to fetch location from ip-api.com
async function fetchLocationFromIPAPI(ipAddress) {
  if (!ipAddress || ipAddress === 'Unknown') {
    return null;
  }

  try {
    const axios = require('axios');
    const response = await axios.get(`http://ip-api.com/json/${encodeURIComponent(ipAddress)}`, {
      params: {
        fields: 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting'
      },
      timeout: 5000
    });

    if (response.data && response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        city: response.data.city || 'Unknown',
        region: response.data.regionName || response.data.region || 'Unknown',
        timezone: response.data.timezone || null,
        zip: response.data.zip || null,
        lat: response.data.lat || null,
        lon: response.data.lon || null,
        isp: response.data.isp || null,
        org: response.data.org || null,
        as: response.data.as || null,
        mobile: response.data.mobile || false,
        proxy: response.data.proxy || false,
        hosting: response.data.hosting || false
      };
    }
  } catch (error) {
    console.warn('Failed to fetch location from ip-api.com:', error.message);
  }

  return null;
}

// Create or update visitor
router.post('/visitor', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { 
      visitorId, 
      sessionId, 
      tenantId, 
      name, 
      email, 
      phone, 
      avatar, 
      currentPage, 
      referrer, 
      location, 
      device, 
      userAgent, 
      ipAddress,
      tags,
      sessionDuration,
      messagesCount,
      lastActivity,
      source,
      medium,
      campaign,
      content,
      term,
      keyword,
      searchEngine,
      landingPage,
      isReturning
    } = req.body;
    
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
    console.log('Visitor update request:', { visitorId, sessionDuration, currentPage });
    }
    
    if (!visitorId || !sessionId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, sessionId, and tenantId are required' 
      });
    }

    // Get the default brand for this tenant (first available brand)
    const { Brand } = require('../models');
    const defaultBrand = await Brand.findOne({
      where: { tenant_id: tenantId },
      attributes: ['id']
    });
    const defaultBrandId = defaultBrand ? defaultBrand.id : null;

    // Check if visitor already exists
    let visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      },
      attributes: ['id', 'session_id', 'name', 'email', 'phone', 'avatar', 'current_page', 'referrer', 'location', 'device', 'user_agent', 'ip_address', 'tags', 'session_duration', 'messages_count', 'visits_count', 'last_activity', 'status', 'is_active', 'source', 'medium', 'campaign', 'content', 'term', 'keyword', 'search_engine', 'landing_page', 'tenant_id', 'brand_id']
    });

    // If IP is provided but location is missing, fetch from ip-api.com
    let finalLocation = location && typeof location === 'object' ? location : null;
    let finalIPAddress = ipAddress || null;
    
    // Get IP from request if not provided in body
    if (!finalIPAddress) {
      const getClientIP = (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               req.ip ||
               null;
      };
      finalIPAddress = getClientIP(req);
    }

    // Check if IP is banned (using cached service)
    if (finalIPAddress && finalIPAddress !== 'Unknown' && finalIPAddress !== null) {
      const isBanned = await isIPBanned(finalIPAddress, tenantId);
      
      if (isBanned) {
        // IP is banned, return error without showing widget
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied',
          banned: true
        });
      }
    }

    // If we have IP but no location (or location is empty/Unknown), fetch from ip-api.com
    if (finalIPAddress && finalIPAddress !== 'Unknown') {
      if (!finalLocation || !finalLocation.country || finalLocation.country === 'Unknown') {
        // Fetch location from ip-api.com (only log in development)
        if (process.env.NODE_ENV === 'development') {
        console.log('Fetching location from ip-api.com for IP:', finalIPAddress);
        }
        const fetchedLocation = await fetchLocationFromIPAPI(finalIPAddress);
        if (fetchedLocation) {
          finalLocation = fetchedLocation;
        }
      }
    }

    if (visitor) {
      // Update existing visitor
      // Increment visits_count if this is a returning visitor with a new session
      const shouldIncrementVisits = isReturning && visitor.session_id !== sessionId;
      const newVisitsCount = shouldIncrementVisits ? (visitor.visits_count || 1) + 1 : visitor.visits_count;
      
      // Use fetched location if available, otherwise use existing location
      // Only update location if we have valid data (not empty object or Unknown)
      let locationToSave = visitor.location && typeof visitor.location === 'object' && 
                          visitor.location.country && visitor.location.country !== 'Unknown'
                          ? visitor.location : {};
      
      // Override with new location if it's valid
      if (finalLocation && finalLocation.country && finalLocation.country !== 'Unknown') {
        locationToSave = finalLocation;
      }
      
      await visitor.update({
        session_id: sessionId,
        name: name || visitor.name,
        email: email || visitor.email,
        phone: phone || visitor.phone,
        avatar: avatar || visitor.avatar,
        current_page: currentPage || visitor.current_page,
        referrer: referrer || visitor.referrer,
        location: (locationToSave && locationToSave.country && locationToSave.country !== 'Unknown') 
          ? locationToSave 
          : (visitor.location && typeof visitor.location === 'object' && visitor.location.country && visitor.location.country !== 'Unknown' 
              ? visitor.location 
              : {}),
        device: device || visitor.device,
        user_agent: userAgent || visitor.user_agent,
        ip_address: finalIPAddress || visitor.ip_address,
        tags: tags || visitor.tags,
        session_duration: sessionDuration !== undefined ? sessionDuration : visitor.session_duration,
        messages_count: messagesCount !== undefined ? messagesCount : visitor.messages_count,
        visits_count: newVisitsCount,
        last_activity: lastActivity ? new Date(lastActivity) : new Date(),
        // Only update status to 'idle' if visitor was previously offline or away
        // Don't overwrite active status like 'online'
        status: (visitor.status === 'offline' || visitor.status === 'away') ? 'idle' : visitor.status,
        is_active: true,
        // Update tracking fields only if provided (don't overwrite existing data)
        source: source || visitor.source,
        medium: medium || visitor.medium,
        campaign: campaign || visitor.campaign,
        content: content || visitor.content,
        term: term || visitor.term,
        keyword: keyword || visitor.keyword,
        search_engine: searchEngine || visitor.search_engine,
        landing_page: landingPage || visitor.landing_page
      });
      
      // Always emit visitor update for returning visitors to ensure they show up in active section
      if (isReturning) {
        // Log only in development
        if (process.env.NODE_ENV === 'development' && shouldIncrementVisits) {
          console.log('Returning visitor detected, visits count:', newVisitsCount);
        }
        const io = req.app.get('io');
        if (io) {
          // Fetch the updated visitor with all associations
          const updatedVisitor = await Visitor.findByPk(visitor.id, {
            include: [
              {
                model: require('../models').User,
                as: 'assignedAgent',
                attributes: ['id', 'name', 'avatar'],
                required: false
              },
              {
                model: require('../models').Brand,
                as: 'brand',
                attributes: ['id', 'name', 'primary_color'],
                required: false
              }
            ]
          });
          
          if (updatedVisitor) {
            const updateData = {
              id: updatedVisitor.id,
              name: updatedVisitor.name,
              email: updatedVisitor.email,
              phone: updatedVisitor.phone,
              avatar: updatedVisitor.avatar,
              status: updatedVisitor.status,
              currentPage: updatedVisitor.current_page,
              referrer: updatedVisitor.referrer,
              ipAddress: updatedVisitor.ip_address || 'Unknown',
              location: updatedVisitor.location && typeof updatedVisitor.location === 'object' && !Array.isArray(updatedVisitor.location)
                ? {
                    country: updatedVisitor.location.country || 'Unknown',
                    city: updatedVisitor.location.city || 'Unknown',
                    region: updatedVisitor.location.region || 'Unknown'
                  }
                : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
              device: updatedVisitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
              lastActivity: updatedVisitor.last_activity,
              sessionDuration: updatedVisitor.session_duration?.toString() || '0',
              messagesCount: updatedVisitor.messages_count || 0,
              visitsCount: updatedVisitor.visits_count || newVisitsCount,
              isTyping: updatedVisitor.is_typing || false,
              assignedAgent: updatedVisitor.assignedAgent,
              brand: updatedVisitor.brand ? {
                id: updatedVisitor.brand.id,
                name: updatedVisitor.brand.name,
                primaryColor: updatedVisitor.brand.primary_color
              } : null,
              brandName: updatedVisitor.brand?.name || 'No Brand',
              tags: updatedVisitor.tags || [],
              notes: updatedVisitor.notes,
              createdAt: updatedVisitor.created_at,
              updatedAt: updatedVisitor.updated_at,
              lastWidgetUpdate: updatedVisitor.last_widget_update,
              widgetStatus: updatedVisitor.widget_status
            };
            
            // Emit to brand-specific room so only agents assigned to this brand see the update
            if (updatedVisitor.brand_id) {
              io.to(`brand_${updatedVisitor.brand_id}`).emit('visitor:update', updateData);
              console.log(`Emitted visitor:update to brand room: brand_${updatedVisitor.brand_id}`);
            } else {
              console.warn('Visitor has no brand_id, emitting to tenant room as fallback');
              io.to(`tenant_${tenantId}`).emit('visitor:update', updateData);
            }
          }
        }
      }
    } else {
      // Create new visitor
      visitor = await Visitor.create({
        id: visitorId,
        session_id: sessionId,
        tenant_id: tenantId,
        brand_id: defaultBrandId, // Assign to default brand for tenant
        name: name || 'Anonymous Visitor',
        email: email || null,
        phone: phone || null,
        avatar: avatar || null,
        current_page: currentPage || null,
        referrer: referrer || 'Direct',
        location: (finalLocation && finalLocation.country && finalLocation.country !== 'Unknown') ? finalLocation : {},
        device: device || {},
        user_agent: userAgent || null,
        ip_address: finalIPAddress || null,
        tags: tags || [],
        status: 'idle',
        is_active: true,
        last_activity: new Date(),
        session_duration: sessionDuration || 0,
        messages_count: messagesCount || 0,
        visits_count: 1,
        is_typing: false,
        // Enhanced tracking fields
        source: source || 'Direct',
        medium: medium || 'none',
        campaign: campaign || null,
        content: content || null,
        term: term || null,
        keyword: keyword || null,
        search_engine: searchEngine || null,
        landing_page: landingPage || null
      });

      // Emit socket event for new visitor to agents
      const io = req.app.get('io');
      if (io) {
        // Reload visitor with brand relationship to ensure brand data is included
        const visitorWithBrand = await Visitor.findByPk(visitor.id, {
          include: [
            {
              model: require('../models').Brand,
              as: 'brand',
              attributes: ['id', 'name', 'primary_color'],
              required: false
            }
          ]
        });

        const visitorData = {
          id: visitorWithBrand.id,
          name: visitorWithBrand.name,
          email: visitorWithBrand.email,
          phone: visitorWithBrand.phone,
          avatar: visitorWithBrand.avatar,
          status: visitorWithBrand.status,
          currentPage: visitorWithBrand.current_page,
          referrer: visitorWithBrand.referrer || 'Direct',
          ipAddress: visitorWithBrand.ip_address || 'Unknown',
          location: visitorWithBrand.location && typeof visitorWithBrand.location === 'object' && !Array.isArray(visitorWithBrand.location)
            ? {
                country: visitorWithBrand.location.country || 'Unknown',
                city: visitorWithBrand.location.city || 'Unknown',
                region: visitorWithBrand.location.region || 'Unknown'
              }
            : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
          device: visitorWithBrand.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
          lastActivity: visitorWithBrand.last_activity,
          sessionDuration: visitorWithBrand.session_duration?.toString() || '0',
          messagesCount: visitorWithBrand.messages_count || 0,
          visitsCount: visitorWithBrand.visits_count || 1,
          isTyping: visitorWithBrand.is_typing || false,
          assignedAgent: null,
          tags: visitorWithBrand.tags || [],
          notes: visitorWithBrand.notes,
          createdAt: visitorWithBrand.created_at,
          updatedAt: visitorWithBrand.updated_at,
          lastWidgetUpdate: visitorWithBrand.last_widget_update,
          widgetStatus: visitorWithBrand.widget_status,
          // Include brand data
          brand: visitorWithBrand.brand ? {
            id: visitorWithBrand.brand.id,
            name: visitorWithBrand.brand.name,
            primaryColor: visitorWithBrand.brand.primary_color
          } : null,
          brandName: visitorWithBrand.brand?.name || 'No Brand',
          // Include tracking fields
          source: visitorWithBrand.source,
          medium: visitorWithBrand.medium,
          campaign: visitorWithBrand.campaign,
          content: visitorWithBrand.content,
          term: visitorWithBrand.term,
          keyword: visitorWithBrand.keyword,
          searchEngine: visitorWithBrand.search_engine,
          landingPage: visitorWithBrand.landing_page
        };
        
        console.log('Emitting visitor:new event:', visitorData);
        
        // Emit to brand-specific room so only agents assigned to this brand see the visitor
        if (visitorWithBrand.brand_id) {
          io.to(`brand_${visitorWithBrand.brand_id}`).emit('visitor:new', visitorData);
          console.log(`Emitted visitor:new to brand room: brand_${visitorWithBrand.brand_id}`);
        } else {
          // Fallback: if no brand, emit to tenant (shouldn't happen in production)
          console.warn('Visitor has no brand_id, emitting to tenant room as fallback');
          io.to(`tenant_${tenantId}`).emit('visitor:new', visitorData);
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        visitorId: visitor.id,
        message: visitor.id === visitorId ? 'Visitor updated' : 'Visitor created'
      }
    });
  } catch (error) {
    console.error('Create/update visitor error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create/update visitor',
      error: error.message 
    });
  }
});

// Get visitor IP from request headers (fallback endpoint)
router.get('/visitor/ip', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Get IP from request headers (handles proxy/load balancer scenarios)
    const getClientIP = (req) => {
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.ip ||
             'Unknown';
    };
    
    const ip = getClientIP(req);
    
    res.json({
      success: true,
      ip: ip
    });
  } catch (error) {
    console.error('Get visitor IP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get IP address',
      error: error.message 
    });
  }
});

// Update visitor activity
router.post('/visitor/activity', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, activity, page, timestamp } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    const visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      }
    });

    if (visitor) {
      // Only update status to 'idle' if visitor was previously offline or away
      // Preserve active status like 'online' or 'idle' when visitor is active
      const newStatus = (visitor.status === 'offline' || visitor.status === 'away') ? 'idle' : visitor.status;
      
      await visitor.update({
        current_page: page || visitor.current_page,
        last_activity: new Date(),
        session_duration: Math.floor((Date.now() - new Date(visitor.created_at)) / 1000),
        status: newStatus,
        is_active: true
      });
    }
    
    res.json({
      success: true,
      message: 'Activity updated'
    });
  } catch (error) {
    console.error('Update visitor activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update visitor activity',
      error: error.message 
    });
  }
});

// Update visitor status
router.post('/visitor/status', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, status } = req.body;
    
    if (!visitorId || !tenantId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, and status are required' 
      });
    }

    const validStatuses = ['online', 'away', 'offline', 'idle'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be online, away, offline, or idle' 
      });
    }

    const visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      }
    });

    if (visitor) {
      const oldStatus = visitor.status;
      await visitor.update({
        status: status,
        last_activity: new Date()
      });
      
      // Emit visitor:leave event if status changed to offline
      if (status === 'offline' && oldStatus !== 'offline') {
        // If visitor has no assigned agent (AI-only session), automatically close the session
        if (!visitor.assigned_agent_id) {
          console.log('AI-only visitor leaving, automatically closing session:', visitorId);
          
          // Update visitor to closed/ended status
          await visitor.update({
            status: 'offline',
            is_active: false,
            last_activity: new Date()
          });
          
          // Emit session ended event
          const io = req.app.get('io');
          if (io) {
            io.to(`tenant_${tenantId}`).emit('visitor:session-ended', {
              visitorId: visitorId,
              reason: 'ai-only-leave'
            });
          }
        }
        
        const io = req.app.get('io');
        if (io) {
          console.log('Emitting visitor:leave event for visitor:', visitorId);
          // Get visitor's brand_id to emit to brand-specific room
          const visitor = await Visitor.findByPk(visitorId, { attributes: ['brand_id'] });
          if (visitor && visitor.brand_id) {
            io.to(`brand_${visitor.brand_id}`).emit('visitor:leave', visitorId);
            console.log(`Emitted visitor:leave to brand room: brand_${visitor.brand_id}`);
          } else {
            console.warn('Visitor has no brand_id, emitting to tenant room as fallback');
            io.to(`tenant_${tenantId}`).emit('visitor:leave', visitorId);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Status updated'
    });
  } catch (error) {
    console.error('Update visitor status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update visitor status',
      error: error.message 
    });
  }
});

// Update visitor typing status
router.post('/visitor/typing', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, isTyping } = req.body;
    
    if (!visitorId || !tenantId || typeof isTyping !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, and isTyping (boolean) are required' 
      });
    }

    const visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      }
    });

    if (visitor) {
      await visitor.update({
        is_typing: isTyping,
        last_activity: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Typing status updated'
    });
  } catch (error) {
    console.error('Update visitor typing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update visitor typing status',
      error: error.message 
    });
  }
});

// Handle visitor status check
router.post('/visitor/status', async (req, res) => {
  try {
    const { visitorId, tenantId } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Find visitor and check if agent is assigned
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId },
      attributes: ['id', 'assigned_agent_id', 'status']
    });

    if (visitor) {
      res.json({
        success: true,
        data: {
          visitorId: visitor.id,
          assignedAgentId: visitor.assigned_agent_id,
          status: visitor.status
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Visitor not found'
      });
    }
  } catch (error) {
    console.error('Visitor status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check visitor status' });
  }
});

// Handle visitor chat session status check
router.post('/visitor/session-status', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Find visitor and check their chat session status
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId },
      attributes: ['id', 'assigned_agent_id', 'status', 'created_at', 'last_activity']
    });

    if (!visitor) {
      return res.json({
        success: true,
        data: {
          isNewVisitor: true,
          hasActiveSession: false,
          assignedAgentId: null,
          sessionStatus: 'new'
        }
      });
    }

    // Check if visitor has recent activity (within last 30 minutes)
    const lastActivity = visitor.last_activity ? new Date(visitor.last_activity) : new Date(visitor.created_at);
    const now = new Date();
    const timeDiff = now - lastActivity;
    const isRecentActivity = timeDiff < (30 * 60 * 1000); // 30 minutes

    // Determine session status
    let sessionStatus = 'new';
    let hasActiveSession = false;

    if (visitor.assigned_agent_id && isRecentActivity) {
      // Visitor has an assigned agent and recent activity - active session
      sessionStatus = 'active_with_agent';
      hasActiveSession = true;
    } else if (visitor.assigned_agent_id && !isRecentActivity) {
      // Visitor had an agent but no recent activity - session ended
      sessionStatus = 'ended_with_agent';
      hasActiveSession = false;
    } else if (!visitor.assigned_agent_id && isRecentActivity) {
      // Visitor has recent activity but no agent - active AI session
      sessionStatus = 'active_with_ai';
      hasActiveSession = true;
    } else {
      // No recent activity - new session
      sessionStatus = 'new';
      hasActiveSession = false;
    }

    res.json({
      success: true,
      data: {
        isNewVisitor: false,
        hasActiveSession: hasActiveSession,
        assignedAgentId: visitor.assigned_agent_id,
        sessionStatus: sessionStatus,
        lastActivity: visitor.last_activity,
        visitorCreatedAt: visitor.created_at
      }
    });
  } catch (error) {
    console.error('Visitor session status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check visitor session status' });
  }
});

// Handle visitor agent transfer request
router.post('/visitor/request-agent', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, reason } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Check if there are available agents (just to verify availability)
    const { User } = require('../models');
    const availableAgents = await User.findAll({
      where: {
        tenant_id: tenantId,
        role: 'agent',
        status: 'active',
        agent_presence_status: 'online'
      },
      limit: 1
    });

    if (availableAgents.length === 0) {
      return res.json({
        success: false,
        message: 'No agents currently available'
      });
    }

    // Update visitor status WITHOUT assigning specific agent
    // This makes it visible in Transfer Chats section for all online agents
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (visitor) {
      await visitor.update({
        assigned_agent_id: null, // Don't assign to specific agent
        status: 'waiting_for_agent' // Set to waiting_for_agent to move to Transfer Chats section
      });
    }

    // Store transfer message in database
    try {
      const { VisitorMessage } = require('../models');
      await VisitorMessage.create({
        visitor_id: visitorId,
        tenant_id: tenantId,
        sender_type: 'system',
        sender_name: 'System',
        message: "I'm transferring you to a human agent. An agent will be with you shortly.",
        message_type: 'system',
        is_read: false,
        metadata: {
          transfer_type: 'ai_to_agent_pool'
        }
      });
    } catch (dbError) {
      console.error('Error storing transfer message:', dbError);
    }

    // Emit socket event to notify widget and ALL agents that chat is being transferred
    const io = req.app.get('io');
    if (io) {
      const transferData = {
        visitorId: visitorId,
        tenantId: tenantId,
        message: "I'm transferring you to a human agent. Please hold on while I connect you...",
        timestamp: new Date().toISOString(),
        type: 'ai_transfer_pool'
      };
      console.log('Emitting visitor:transfer event for transfer to pool:', transferData);
      
      // Send to specific visitor room - use visitor:transfer, NOT agent:join
      io.to(`visitor_${visitorId}`).emit('visitor:transfer', transferData);
      
      // Get visitor's brand_id to emit to brand-specific room (ALL agents in that brand)
      const visitorData = await Visitor.findByPk(visitorId, { 
        attributes: ['brand_id'],
        include: [
          {
            model: require('../models').Brand,
            as: 'brand',
            attributes: ['id', 'name', 'primary_color'],
            required: false
          }
        ]
      });
      
      if (visitorData && visitorData.brand_id) {
        // Broadcast to brand-specific room so ALL agents assigned to that brand receive it
        io.to(`brand_${visitorData.brand_id}`).emit('visitor:transfer', transferData);
        console.log(`Emitted visitor:transfer to brand room (all agents): brand_${visitorData.brand_id}`);
      } else {
        console.warn('Visitor has no brand_id, emitting to tenant room (all agents) as fallback');
        io.to(`tenant_${tenantId}`).emit('visitor:transfer', transferData);
      }
      
      // Also emit visitor update so UI refreshes for all agents
      if (visitorData) {
        const transformedVisitor = {
          id: visitorData.id,
          name: visitorData.name || 'Anonymous Visitor',
          email: visitorData.email,
          phone: visitorData.phone,
          avatar: visitorData.avatar,
          status: 'waiting_for_agent',
          assignedAgent: null, // No specific agent assigned
          brand: visitorData.brand,
          brandName: visitorData.brand?.name || 'No Brand',
          last_activity: visitorData.last_activity || new Date(),
          created_at: visitorData.created_at,
          updated_at: visitorData.updated_at
        };
        
        io.to(`tenant_${tenantId}`).emit('visitor:update', transformedVisitor);
      }
    }

    res.json({
      success: true,
      message: 'Chat moved to transfer pool - visible to all online agents',
      data: {
        agentId: null, // No specific agent assigned
        agentName: null
      }
    });
  } catch (error) {
    console.error('Agent transfer request error:', error);
    res.status(500).json({ success: false, message: 'Failed to request agent transfer' });
  }
});

// Handle OPTIONS request for create-ticket endpoint
router.options('/visitor/create-ticket', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

// Handle visitor create ticket from offline form
router.post('/visitor/create-ticket', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, name, email, phone, message } = req.body;
    
    console.log('Create ticket request received:', { visitorId, tenantId, hasName: !!name, hasEmail: !!email, hasMessage: !!message });
    
    if (!visitorId || !tenantId || !name || !email || !message) {
      console.error('Missing required fields:', { visitorId: !!visitorId, tenantId: !!tenantId, name: !!name, email: !!email, message: !!message });
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, name, email, and message are required' 
      });
    }

    // Get visitor to find customer_id and brand_id
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (!visitor) {
      console.error('Visitor not found:', { visitorId, tenantId });
      return res.status(404).json({ 
        success: false, 
        message: 'Visitor not found' 
      });
    }
    
    console.log('Visitor found:', visitor.id);

    // Get or create customer/user record if needed
    let customerId = visitor.customer_id;
    if (!customerId && email) {
      // Check if customer exists with this email
      const { User } = require('../models');
      let customer = await User.findOne({
        where: {
          email: email,
          tenant_id: tenantId,
          role: 'customer'
        }
      });

      if (!customer) {
        try {
          // Create customer record - generate a random password for customers (they won't login via normal auth)
          const randomPassword = require('crypto').randomBytes(16).toString('hex');
          customer = await User.create({
            name: name,
            email: email,
            tenant_id: tenantId,
            role: 'customer',
            status: 'active',
            password: randomPassword // Required field, but customers typically don't login
          });
          console.log('New customer created:', customer.id);
        } catch (createError) {
          // If creation fails (e.g., email already exists with different role), try to find any user with this email
          console.warn('Failed to create customer, checking if user exists:', createError.message);
          customer = await User.findOne({
            where: {
              email: email,
              tenant_id: tenantId
            }
          });
          
          if (customer && customer.role !== 'customer') {
            // If user exists but with different role, we can't use it as customer_id
            // We'll create the ticket without customer_id or use null
            console.warn('User exists with different role:', customer.role);
            customer = null;
          }
        }
        
      } else {
        console.log('Existing customer found:', customer.id);
      }

      if (customer) {
        customerId = customer.id;
        console.log('Customer ID set to:', customerId);
      } else {
        console.warn('Could not create or find customer, proceeding without customer_id');
      }
      
      // Update visitor with customer_id and phone if provided (single update)
      const visitorUpdateData = {};
      if (customerId) {
        visitorUpdateData.customer_id = customerId;
      }
      if (phone) {
        visitorUpdateData.phone = phone;
      }
      if (Object.keys(visitorUpdateData).length > 0) {
        await visitor.update(visitorUpdateData);
      }
    } else {
      console.log('Using existing customer_id:', customerId);
    }

    // Ensure customerId exists - if still null, try to create one
    // Note: customerId can be null for tickets - it's optional in the Ticket model
    if (!customerId && email) {
      try {
        const { User } = require('../models');
        // Generate a random password for customers (they won't login via normal auth)
        const randomPassword = require('crypto').randomBytes(16).toString('hex');
        const customer = await User.create({
          name: name,
          email: email,
          tenant_id: tenantId,
          role: 'customer',
          status: 'active',
          password: randomPassword // Required field, but customers typically don't login
        });
        customerId = customer.id;
        console.log('Fallback customer creation successful:', customerId);
        
        // Update visitor with customer_id and phone if provided
        const updateData = { customer_id: customerId };
        if (phone) {
          updateData.phone = phone;
        }
        await visitor.update(updateData);
      } catch (fallbackError) {
        console.warn('Fallback customer creation failed, proceeding without customer_id:', fallbackError.message);
        // Continue without customer_id - Ticket model allows null customer_id
        customerId = null;
      }
    }
    
    // customerId can be null - Ticket model allows it (allowNull: true)
    console.log('Final customerId:', customerId);

    // Find an available agent to assign the ticket to
    let assignedAgentId = null;
    try {
      const { getAvailableAgents } = require('../services/triggerService');
      const availableAgents = await getAvailableAgents(tenantId, null);
      
      if (availableAgents && availableAgents.length > 0) {
        // Assign to the least busy agent
        assignedAgentId = availableAgents[0].id;
      } else {
        // If no online agents, find any active agent as fallback
        const { User } = require('../models');
        const anyAgent = await User.findOne({
          where: {
            tenant_id: tenantId,
            role: 'agent',
            status: 'active'
          },
          order: [['created_at', 'ASC']] // Assign to oldest agent as fallback
        });
        
        if (anyAgent) {
          assignedAgentId = anyAgent.id;
        }
      }
    } catch (agentError) {
      console.error('Error finding available agents:', agentError);
      // Continue without agent assignment - ticket will be created as 'open'
    }

    // Create ticket
    const { Ticket } = require('../models');
    
    // Prepare ticket data
    const ticketData = {
      tenant_id: parseInt(tenantId), // Ensure it's an integer
      customer_id: customerId ? parseInt(customerId) : null,
      agent_id: assignedAgentId ? parseInt(assignedAgentId) : null,
      subject: `Contact Form: ${name}`.substring(0, 255), // Ensure subject doesn't exceed 255 chars
      description: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`,
      status: assignedAgentId ? 'pending' : 'open',
      priority: 'medium',
      category: 'Support Request'
    };
    
    // Add tags as JSON array - Sequelize should handle JSON fields automatically
    // Only add tags if the field exists in the model
    ticketData.tags = ['offline-form', 'widget'];
    
    console.log('Creating ticket with data:', { 
      tenant_id: ticketData.tenant_id,
      customer_id: ticketData.customer_id,
      agent_id: ticketData.agent_id,
      subject: ticketData.subject?.substring(0, 50),
      status: ticketData.status,
      hasTags: !!ticketData.tags
    });
    
    let ticket;
    try {
      ticket = await Ticket.create(ticketData);
    } catch (ticketError) {
      console.error('Ticket creation error:', ticketError);
      console.error('Ticket error details:', {
        name: ticketError.name,
        message: ticketError.message,
        errors: ticketError.errors
      });
      
      // If tags field is causing issues, try without it
      if (ticketError.message.includes('tags') || ticketError.errors?.some(e => e.path === 'tags')) {
        console.warn('Retrying ticket creation without tags field');
        delete ticketData.tags;
        ticket = await Ticket.create(ticketData);
      } else {
        throw ticketError;
      }
    }

    console.log('Ticket created successfully from offline form:', ticket.id, { assignedAgentId, visitorId });

    // Emit socket event to notify assigned agent (if any)
    if (assignedAgentId) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${assignedAgentId}`).emit('ticket:new', {
          ticketId: ticket.id,
          subject: ticket.subject,
          customerName: name,
          customerEmail: email,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        ticketId: ticket.id,
        assignedAgentId: assignedAgentId
      }
    });
  } catch (error) {
    console.error('========================================');
    console.error('Create ticket from form error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    console.error('Request body:', {
      visitorId: req.body.visitorId || 'unknown',
      tenantId: req.body.tenantId || 'unknown',
      hasEmail: !!req.body.email,
      hasName: !!req.body.name,
      hasMessage: !!req.body.message
    });
    console.error('========================================');
    
    // Ensure response is sent
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create ticket',
        error: error.message || 'Unknown error occurred',
        errorType: error.name,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          errors: error.errors
        } : undefined
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// Handle visitor end chat
router.post('/visitor/end-chat', async (req, res) => {
  try {
    const { visitorId, tenantId, rating, feedback } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Update visitor to remove assigned agent and find associated chat
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (visitor) {
      await visitor.update({
        assigned_agent_id: null,
        status: 'offline'
      });
      
      // Find and update associated chat if exists
      const { Chat } = require('../models');
      const chat = await Chat.findOne({
        where: {
          customer_id: visitor.customer_id || visitor.id,
          tenant_id: tenantId,
          status: { [require('sequelize').Op.in]: ['waiting', 'active'] }
        },
        order: [['created_at', 'DESC']],
        limit: 1
      });
      
      if (chat) {
        await chat.update({
          status: 'visitor_left',
          ended_at: new Date(),
          rating: rating || chat.rating,
          rating_feedback: feedback || chat.rating_feedback
        });
        console.log('Updated chat status to visitor_left:', chat.id);
      }
      
      console.log('Visitor ended chat:', visitorId, { rating, hasFeedback: !!feedback });
      
      // Store system message in database
      const { VisitorMessage } = require('../models');
      const systemMessage = await VisitorMessage.create({
        visitor_id: visitorId,
        tenant_id: tenantId,
        sender_type: 'system',
        sender_name: 'System',
        message: 'Visitor ended the chat.',
        message_type: 'system',
        is_read: false,
        metadata: {
          event_type: 'chat_ended',
          ended_by: 'visitor',
          rating: rating,
          has_feedback: !!feedback
        }
      });
      
      // Emit socket event to notify agents with system message data
      const io = req.app.get('io');
      if (io) {
        const endData = {
          visitorId: visitorId,
          tenantId: tenantId,
          endedBy: 'visitor',
          rating: rating,
          feedback: feedback,
          // Include system message data for immediate display
          message: {
            id: systemMessage.id.toString(),
            content: 'Visitor ended the chat.',
            sender: 'system',
            senderName: 'System',
            timestamp: systemMessage.created_at,
            visitorId: visitorId,
            isRead: false,
            messageType: 'system',
            metadata: systemMessage.metadata
          }
        };
        console.log('Emitting visitor:end-chat event:', endData);
        
        // Send to specific visitor room
        io.to(`visitor_${visitorId}`).emit('visitor:end-chat', endData);
        
        // Get visitor's brand_id to emit to brand-specific room
        const visitorData = await Visitor.findByPk(visitorId, { attributes: ['brand_id', 'assigned_agent_id'] });
        if (visitorData && visitorData.brand_id) {
          // Broadcast to brand-specific room so only assigned agents receive
          io.to(`brand_${visitorData.brand_id}`).emit('visitor:end-chat', endData);
          console.log(`Emitted visitor:end-chat to brand room: brand_${visitorData.brand_id}`);
        } else {
          console.warn('Visitor has no brand_id, emitting to tenant room as fallback');
          io.to(`tenant_${tenantId}`).emit('visitor:end-chat', endData);
        }
        
        // Also emit the system message directly to agents who are monitoring this visitor
        if (visitorData && visitorData.assigned_agent_id) {
          io.to(`agent_${visitorData.assigned_agent_id}`).emit('visitor:end-chat', endData);
        }
      }
    }

    res.json({
      success: true,
      message: 'Chat ended successfully'
    });
  } catch (error) {
    console.error('End chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to end chat' });
  }
});

// Submit rating and feedback
router.post('/visitor/submit-rating', async (req, res) => {
  try {
    const { visitorId, tenantId, rating, feedback } = req.body;
    
    if (!visitorId || !tenantId || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, and rating are required' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Find the visitor and get associated chat
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId },
      include: [{
        model: require('../models').Chat,
        as: 'chats'
      }]
    });

    if (!visitor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visitor not found' 
      });
    }

    // Update chat rating and feedback if chat exists
    // For now, we'll store it in visitor metadata
    await visitor.update({
      metadata: {
        ...(visitor.metadata || {}),
        rating: rating,
        feedback: feedback,
        ratedAt: new Date().toISOString()
      }
    });

    console.log('Rating submitted:', { visitorId, rating, hasFeedback: !!feedback });
    
    // Emit socket event to notify agents
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant_${tenantId}`).emit('visitor:rating-submitted', {
        visitorId: visitorId,
        rating: rating,
        feedback: feedback
      });
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// Handle visitor file upload
router.post('/visitor/upload', visitorUpload.single('file'), async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Verify visitor exists
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (!visitor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visitor not found' 
      });
    }

    // Generate unique file name
    const fileExt = path.extname(req.file.originalname);
    const fileName = `visitor-attachments/${tenantId}/${visitorId}/${uuidv4()}${fileExt}`;

    console.log('📤 Visitor file upload started:', {
      fileName: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      targetFileName: fileName,
      visitorId,
      tenantId
    });

    // Upload to storage (R2 or configured provider)
    let fileUrl;
    try {
      fileUrl = await uploadFile(fileName, req.file.buffer, req.file.mimetype);
      console.log('✅ File uploaded successfully to storage:', fileUrl);
    } catch (uploadError) {
      console.error('❌ File upload error:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError.message,
        code: uploadError.code,
        stack: uploadError.stack
      });
      throw uploadError;
    }

    // Determine message type
    const messageType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        message_type: messageType
      }
    });
  } catch (error) {
    console.error('❌ Visitor file upload error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Handle visitor messages
router.post('/visitor/message', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, message, sender = 'visitor', file_url, file_name, file_size, message_type = 'text' } = req.body;
    
    if (!visitorId || !tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId and tenantId are required' 
      });
    }

    // Message can be empty if it's a file-only message
    const messageContent = message || (file_name ? `📎 ${file_name}` : '');

    // Store message in database
    const messageRecord = await VisitorMessage.create({
      visitor_id: visitorId,
      tenant_id: tenantId,
      sender_type: sender,
      sender_name: sender === 'visitor' ? 'Visitor' : sender,
      message: messageContent,
      message_type: message_type || (file_url ? (file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'file') : 'text'),
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      is_read: false,
      metadata: {}
    });

    console.log('Visitor message stored in database:', messageRecord.id);

    // Update visitor status to idle (active) when they send a message
    // This ensures they appear in the Active Visitors section
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (visitor) {
      // Update visitor status to idle and update last activity
      await visitor.update({
        status: 'idle',
        last_activity: new Date(),
        messages_count: (visitor.messages_count || 0) + 1
      });

      console.log('Updated visitor status to idle after message:', visitorId);

      // Emit visitor update to agents so they see the visitor is now active
      const io = req.app.get('io');
      if (io) {
        const updatedVisitor = await Visitor.findByPk(visitor.id, {
          include: [
            {
              model: require('../models').User,
              as: 'assignedAgent',
              attributes: ['id', 'name', 'avatar'],
              required: false
            },
            {
              model: require('../models').Brand,
              as: 'brand',
              attributes: ['id', 'name', 'primary_color'],
              required: false
            }
          ]
        });

        if (updatedVisitor) {
          // Emit to brand-specific room
          if (updatedVisitor.brand_id) {
            io.to(`brand_${updatedVisitor.brand_id}`).emit('visitor:update', {
            id: updatedVisitor.id,
            name: updatedVisitor.name,
            email: updatedVisitor.email,
            phone: updatedVisitor.phone,
            avatar: updatedVisitor.avatar,
            status: updatedVisitor.status,
            currentPage: updatedVisitor.current_page,
            referrer: updatedVisitor.referrer,
            ipAddress: updatedVisitor.ip_address || 'Unknown',
            location: updatedVisitor.location && typeof updatedVisitor.location === 'object' && !Array.isArray(updatedVisitor.location)
              ? {
                  country: updatedVisitor.location.country || 'Unknown',
                  city: updatedVisitor.location.city || 'Unknown',
                  region: updatedVisitor.location.region || 'Unknown'
                }
              : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
            device: updatedVisitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
            lastActivity: updatedVisitor.last_activity,
            sessionDuration: updatedVisitor.session_duration?.toString() || '0',
            messagesCount: updatedVisitor.messages_count || 0,
            visitsCount: updatedVisitor.visits_count || 1,
            isTyping: updatedVisitor.is_typing || false,
            assignedAgent: updatedVisitor.assignedAgent,
            brand: updatedVisitor.brand ? {
              id: updatedVisitor.brand.id,
              name: updatedVisitor.brand.name,
              primaryColor: updatedVisitor.brand.primary_color
            } : null,
            brandName: updatedVisitor.brand?.name || 'No Brand',
            tags: updatedVisitor.tags || [],
            notes: updatedVisitor.notes,
            createdAt: updatedVisitor.created_at,
            updatedAt: updatedVisitor.updated_at,
            lastWidgetUpdate: updatedVisitor.last_widget_update,
            widgetStatus: updatedVisitor.widget_status
          });
          } else {
            // Fallback: if no brand, emit to tenant (shouldn't happen in production)
            console.warn('Visitor has no brand_id, emitting visitor:update to tenant room as fallback');
            io.to(`tenant_${tenantId}`).emit('visitor:update', {
              id: updatedVisitor.id,
              name: updatedVisitor.name,
              email: updatedVisitor.email,
              phone: updatedVisitor.phone,
              avatar: updatedVisitor.avatar,
              status: updatedVisitor.status,
              currentPage: updatedVisitor.current_page,
              referrer: updatedVisitor.referrer,
              ipAddress: updatedVisitor.ip_address || 'Unknown',
              location: updatedVisitor.location && typeof updatedVisitor.location === 'object' && !Array.isArray(updatedVisitor.location)
                ? {
                    country: updatedVisitor.location.country || 'Unknown',
                    city: updatedVisitor.location.city || 'Unknown',
                    region: updatedVisitor.location.region || 'Unknown'
                  }
                : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
              device: updatedVisitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
              lastActivity: updatedVisitor.last_activity,
              sessionDuration: updatedVisitor.session_duration?.toString() || '0',
              messagesCount: updatedVisitor.messages_count || 0,
              visitsCount: updatedVisitor.visits_count || 1,
              isTyping: updatedVisitor.is_typing || false,
              assignedAgent: updatedVisitor.assignedAgent,
              brand: updatedVisitor.brand ? {
                id: updatedVisitor.brand.id,
                name: updatedVisitor.brand.name,
                primaryColor: updatedVisitor.brand.primary_color
              } : null,
              brandName: updatedVisitor.brand?.name || 'No Brand',
              tags: updatedVisitor.tags || [],
              notes: updatedVisitor.notes,
              createdAt: updatedVisitor.created_at,
              updatedAt: updatedVisitor.updated_at,
              lastWidgetUpdate: updatedVisitor.last_widget_update,
              widgetStatus: updatedVisitor.widget_status
            });
          }
        }
      }
    }

    // Emit socket event to send message to agents
    const ioInstance = req.app.get('io');
    if (ioInstance) {
      const socketData = {
        visitorId: visitorId,
        message: message,
        sender: sender,
        timestamp: messageRecord.created_at,
        messageId: messageRecord.id.toString(),
        tenantId: tenantId,
        file_url: messageRecord.file_url,
        file_name: messageRecord.file_name,
        file_size: messageRecord.file_size,
        message_type: messageRecord.message_type
      };
      console.log('Emitting visitor:message event:', socketData);
      
      // Get visitor's brand_id to emit to brand-specific room
      const visitorForMessage = await Visitor.findByPk(visitorId, { attributes: ['brand_id'] });
      if (visitorForMessage && visitorForMessage.brand_id) {
        // Send to brand-specific room so only assigned agents receive
        ioInstance.to(`brand_${visitorForMessage.brand_id}`).emit('visitor:message', socketData);
        console.log(`Emitted visitor:message to brand room: brand_${visitorForMessage.brand_id}`);
      } else {
        // Fallback: if no brand, emit to tenant (shouldn't happen in production)
        console.warn('Visitor has no brand_id, emitting to tenant room as fallback');
        ioInstance.to(`tenant_${tenantId}`).emit('visitor:message', socketData);
      }
    } else {
      console.log('Socket.io not available for visitor message');
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: messageRecord.id.toString(),
        content: messageRecord.message,
        sender: messageRecord.sender_type,
        timestamp: messageRecord.created_at,
        visitorId: visitorId
      }
    });
  } catch (error) {
    console.error('Send visitor message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message',
      error: error.message 
    });
  }
});

// Log detailed visitor activity
router.post('/visitor/activity-log', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, activityType, activityData, page_url, timestamp } = req.body;
    
    if (!visitorId || !tenantId || !activityType) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, and activityType are required' 
      });
    }

    // Get visitor's session ID
    const visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      }
    });

    if (!visitor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visitor not found' 
      });
    }

    // Find existing activity entry for this visitor, or create new one
    // Update existing row instead of creating duplicate rows for the same visitor
    // This ensures only one row per visitor gets updated with latest activity details
    let activity = await VisitorActivity.findOne({
      where: {
        visitor_id: visitorId,
        tenant_id: tenantId
      }
    });

    if (activity) {
      // Update existing activity entry with latest details
      await activity.update({
        session_id: visitor.session_id,
        activity_type: activityType,
        activity_data: activityData || {},
        page_url: page_url,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });
    } else {
      // Create new activity entry only if it doesn't exist
      activity = await VisitorActivity.create({
      visitor_id: visitorId,
      session_id: visitor.session_id,
      tenant_id: tenantId,
      activity_type: activityType,
      activity_data: activityData || {},
      page_url: page_url,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    }
    
    res.json({
      success: true,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Log visitor activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to log visitor activity',
      error: error.message 
    });
  }
});

module.exports = router;