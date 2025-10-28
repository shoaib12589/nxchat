const express = require('express');
const router = express.Router();
const path = require('path');
const { WidgetSetting, Visitor, VisitorMessage, VisitorActivity, SystemSetting, WidgetKey } = require('../models');
const aiService = require('../services/aiService');

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

    // No minification to prevent syntax errors - just remove comments
    const obfuscatedCode = injectedCode
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, ''); // Remove line comments

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
    
    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

    if (!widgetSettings) {
      // Return default settings if none found
      widgetSettings = {
        tenant_id: tenantId,
        theme_color: '#007bff',
        position: 'bottom-right',
        welcome_message: 'Hello! How can we help you today?',
        enable_audio: false,
        enable_video: false,
        enable_file_upload: true,
        ai_enabled: true,
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
      ai_agent_name: aiSettingsObj.ai_agent_name || 'NxChat Assistant',
      ai_agent_logo: aiSettingsObj.ai_agent_logo || '',
      ai_system_message: aiSettingsObj.ai_system_message || 'You are a helpful AI assistant for NxChat customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.'
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

    // Check if AI is enabled for this tenant
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
          message: `AI transferred this chat to agent ${transferResult.agent.name}`,
          message_type: 'system',
          is_read: false,
          metadata: {
            transfer_type: 'ai_to_agent',
            assigned_agent_id: transferResult.agent.id,
            assigned_agent_name: transferResult.agent.name
          }
        });
        
        console.log('Transfer message stored in database:', transferMessageRecord.id);
      } catch (dbError) {
        console.error('Error storing transfer message in database:', dbError);
      }
      
      // Broadcast transfer notification to agents
      const io = req.app.get('io');
      if (io) {
        const transferData = {
          visitorId: visitorId,
          tenantId: tenantId,
          agentId: transferResult.agent.id,
          agentName: transferResult.agent.name,
          message: 'AI transferred this chat to you',
          timestamp: new Date().toISOString(),
          type: 'ai_transfer'
        };
        
        console.log('Broadcasting transfer notification to agents:', transferData);
        
        // Send to specific agent
        io.to(`user_${transferResult.agent.id}`).emit('chat:transferred', transferData);
        
        // Send to all agents in tenant for general notification
        io.to(`tenant_${tenantId}`).emit('visitor:transfer', transferData);
      }
      
      return res.json({
        success: true,
        data: {
          response: aiResponse.response,
          confidence: aiResponse.confidence,
          tokens_used: aiResponse.tokens_used,
          isTransferRequest: true,
          transferSuccess: true,
          agent: transferResult.agent
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
    
    console.log('Visitor update request:', { visitorId, sessionDuration, currentPage });
    
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
    console.log('Looking for visitor:', { visitorId, tenantId });
    let visitor = await Visitor.findOne({
      where: { 
        id: visitorId,
        tenant_id: tenantId 
      }
    });

    console.log('Visitor lookup result:', { found: !!visitor });

    if (visitor) {
      // Update existing visitor
      // Increment visits_count if this is a returning visitor with a new session
      const shouldIncrementVisits = isReturning && visitor.session_id !== sessionId;
      const newVisitsCount = shouldIncrementVisits ? (visitor.visits_count || 1) + 1 : visitor.visits_count;
      
      await visitor.update({
        session_id: sessionId,
        name: name || visitor.name,
        email: email || visitor.email,
        phone: phone || visitor.phone,
        avatar: avatar || visitor.avatar,
        current_page: currentPage || visitor.current_page,
        referrer: referrer || visitor.referrer,
        location: location || visitor.location,
        device: device || visitor.device,
        user_agent: userAgent || visitor.user_agent,
        ip_address: ipAddress || visitor.ip_address,
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
        console.log('Returning visitor detected' + (shouldIncrementVisits ? `, visits count: ${newVisitsCount}` : ''));
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
            io.to(`tenant_${tenantId}`).emit('visitor:update', {
              id: updatedVisitor.id,
              name: updatedVisitor.name,
              email: updatedVisitor.email,
              phone: updatedVisitor.phone,
              avatar: updatedVisitor.avatar,
              status: updatedVisitor.status,
              currentPage: updatedVisitor.current_page,
              referrer: updatedVisitor.referrer,
              location: updatedVisitor.location,
              device: updatedVisitor.device,
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
              lastWidgetUpdate: updatedVisitor.last_widget_update
            });
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
        location: location || {},
        device: device || {},
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
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
        const visitorData = {
          id: visitor.id,
          name: visitor.name,
          email: visitor.email,
          phone: visitor.phone,
          avatar: visitor.avatar,
          status: visitor.status,
          currentPage: visitor.current_page,
          referrer: visitor.referrer || 'Direct',
          ipAddress: visitor.ip_address,
          location: visitor.location,
          device: visitor.device,
          lastActivity: visitor.last_activity,
          sessionDuration: visitor.session_duration?.toString() || '0',
          messagesCount: visitor.messages_count || 0,
          visitsCount: visitor.visits_count || 1,
          isTyping: visitor.is_typing || false,
          assignedAgent: null,
          tags: visitor.tags || [],
          notes: visitor.notes,
          createdAt: visitor.created_at,
          updatedAt: visitor.updated_at,
          lastWidgetUpdate: visitor.last_widget_update,
          // Include tracking fields
          source: visitor.source,
          medium: visitor.medium,
          campaign: visitor.campaign,
          content: visitor.content,
          term: visitor.term,
          keyword: visitor.keyword,
          searchEngine: visitor.search_engine,
          landingPage: visitor.landing_page
        };
        
        console.log('Emitting visitor:new event:', visitorData);
        io.to(`tenant_${tenantId}`).emit('visitor:new', visitorData);
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
          io.to(`tenant_${tenantId}`).emit('visitor:leave', visitorId);
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

    // Check if there are available agents
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

    // Assign the first available agent
    const assignedAgent = availableAgents[0];
    
    // Update visitor with assigned agent
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (visitor) {
      await visitor.update({
        assigned_agent_id: assignedAgent.id,
        status: 'online'
      });
    }

    // Emit socket event to notify widget that agent has been assigned
    const io = req.app.get('io');
    if (io) {
      const joinData = {
        visitorId: visitorId,
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        tenantId: tenantId
      };
      console.log('Emitting agent:join event for transfer:', joinData);
      
      // Send to specific visitor room
      io.to(`visitor_${visitorId}`).emit('agent:join', joinData);
      
      // Also broadcast to agents for monitoring
      io.to(`tenant_${tenantId}`).emit('agent:join', joinData);
    }

    res.json({
      success: true,
      message: 'Agent assigned successfully',
      data: {
        agentId: assignedAgent.id,
        agentName: assignedAgent.name
      }
    });
  } catch (error) {
    console.error('Agent transfer request error:', error);
    res.status(500).json({ success: false, message: 'Failed to request agent transfer' });
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

    // Update visitor to remove assigned agent
    const visitor = await Visitor.findOne({
      where: { id: visitorId, tenant_id: tenantId }
    });

    if (visitor) {
      await visitor.update({
        assigned_agent_id: null,
        status: 'offline'
      });
      
      console.log('Visitor ended chat:', visitorId, { rating, hasFeedback: !!feedback });
      
      // Emit socket event to notify agents
      const io = req.app.get('io');
      if (io) {
        const endData = {
          visitorId: visitorId,
          tenantId: tenantId,
          endedBy: 'visitor',
          rating: rating,
          feedback: feedback
        };
        console.log('Emitting visitor:end-chat event:', endData);
        
        // Send to specific visitor room
        io.to(`visitor_${visitorId}`).emit('visitor:end-chat', endData);
        
        // Also broadcast to agents for monitoring
        io.to(`tenant_${tenantId}`).emit('visitor:end-chat', endData);
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

// Handle visitor messages
router.post('/visitor/message', async (req, res) => {
  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { visitorId, tenantId, message, sender = 'visitor' } = req.body;
    
    if (!visitorId || !tenantId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'visitorId, tenantId, and message are required' 
      });
    }

    // Store message in database
    const messageRecord = await VisitorMessage.create({
      visitor_id: visitorId,
      tenant_id: tenantId,
      sender_type: sender,
      sender_name: sender === 'visitor' ? 'Visitor' : sender,
      message: message,
      message_type: 'text',
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
          io.to(`tenant_${tenantId}`).emit('visitor:update', {
            id: updatedVisitor.id,
            name: updatedVisitor.name,
            email: updatedVisitor.email,
            phone: updatedVisitor.phone,
            avatar: updatedVisitor.avatar,
            status: updatedVisitor.status,
            currentPage: updatedVisitor.current_page,
            referrer: updatedVisitor.referrer,
            location: updatedVisitor.location,
            device: updatedVisitor.device,
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
            lastWidgetUpdate: updatedVisitor.last_widget_update
          });
        }
      }
    }

    // Emit socket event to send message to agents
    const io = req.app.get('io');
    if (io) {
      const socketData = {
        visitorId: visitorId,
        message: message,
        sender: sender,
        timestamp: messageRecord.created_at,
        messageId: messageRecord.id.toString(),
        tenantId: tenantId
      };
      console.log('Emitting visitor:message event:', socketData);
      
      // Send to tenant room for agents to receive
      io.to(`tenant_${tenantId}`).emit('visitor:message', socketData);
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

    // Create activity log entry
    await VisitorActivity.create({
      visitor_id: visitorId,
      session_id: visitor.session_id,
      tenant_id: tenantId,
      activity_type: activityType,
      activity_data: activityData || {},
      page_url: page_url,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
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