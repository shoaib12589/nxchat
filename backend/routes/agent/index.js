const express = require('express');
const router = express.Router();
const { authenticateToken, requireAgent } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantAuth');
const { cacheMiddleware } = require('../../middleware/cache');
const { cache } = require('../../config/redis');
const { Chat, Message, Ticket, User, Department, AgentSetting, Visitor, VisitorMessage, VisitorActivity, Brand, Trigger } = require('../../models');
const { Op } = require('sequelize');

// Chats management
router.get('/chats', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status = 'active', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { tenant_id: tenantId };
    if (status !== 'all') {
      whereClause.status = status;
    }

    // If user is an agent, only show chats assigned to them or waiting chats
    if (req.user.role === 'agent') {
      whereClause[require('sequelize').Op.or] = [
        { agent_id: req.user.id },
        { status: 'waiting' }
      ];
    }

    // Try to get from cache first
    const cacheKey = `agent:chats:${tenantId}:${status}:${page}:${limit}`;
    const cachedChats = await cache.get(cacheKey);
    
    if (cachedChats) {
      console.log('Cache hit for chats');
      return res.json(cachedChats);
    }

    const { count, rows: chats } = await Chat.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' },
        { 
          model: Message, 
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const response = {
      success: true,
      data: {
        chats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };

    // Cache the response for 2 minutes
    await cache.set(cacheKey, response, 120);
    
    res.json(response);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
});

router.get('/chats/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' },
        { 
          model: Message, 
          as: 'messages',
          include: [{ model: User, as: 'sender' }],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if agent can access this chat
    if (req.user.role === 'agent' && chat.agent_id !== req.user.id && chat.status !== 'waiting') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat' });
  }
});

// Get chat history (completed chats and visitor left chats)
router.get('/history', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const agentId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      startDate,
      endDate,
      search = '',
      sortBy = 'ended_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause for completed/left chats
    const whereClause = {
      tenant_id: tenantId,
      [Op.or]: [
        { status: 'closed' },
        { status: 'completed' },
        { status: 'visitor_left' }
      ]
    };
    
    // Filter by agent if not super admin
    if (req.user.role === 'agent') {
      whereClause.agent_id = agentId;
    }
    
    // Add date range filter
    if (startDate || endDate) {
      whereClause.ended_at = {};
      if (startDate) {
        whereClause.ended_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.ended_at[Op.lte] = new Date(endDate);
      }
    }
    
    // Add search filter
    let searchInclude = [];
    if (search) {
      searchInclude = [
        {
          model: User,
          as: 'customer',
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } }
            ]
          },
          required: false
        }
      ];
    }
    
    const { count, rows: chats } = await Chat.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { 
          model: Message, 
          as: 'messages',
          attributes: ['id', 'message', 'created_at', 'sender_type'],
          limit: 1,
          order: [['created_at', 'DESC']]
        },
        ...searchInclude
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });
    
    // Transform the data
    const transformedChats = chats.map(chat => ({
      id: chat.id,
      status: chat.status,
      startedAt: chat.started_at,
      endedAt: chat.ended_at,
      duration: chat.ended_at && chat.started_at 
        ? Math.round((new Date(chat.ended_at) - new Date(chat.started_at)) / 1000 / 60) // minutes
        : null,
      rating: chat.rating,
      ratingFeedback: chat.rating_feedback,
      customer: chat.customer ? {
        id: chat.customer.id,
        name: chat.customer.name,
        email: chat.customer.email,
        avatar: chat.customer.avatar
      } : null,
      agent: chat.agent ? {
        id: chat.agent.id,
        name: chat.agent.name,
        email: chat.agent.email,
        avatar: chat.agent.avatar
      } : null,
      department: chat.department ? {
        id: chat.department.id,
        name: chat.department.name
      } : null,
      lastMessage: chat.messages && chat.messages.length > 0 ? {
        id: chat.messages[0].id,
        message: chat.messages[0].message,
        createdAt: chat.messages[0].created_at,
        senderType: chat.messages[0].sender_type
      } : null,
      messageCount: chat.messageCount || 0
    }));
    
    res.json({
      success: true,
      data: {
        chats: transformedChats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

router.put('/chats/:id/assign', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    await chat.update({
      agent_id: req.user.id,
      status: 'active',
      started_at: new Date()
    });

    res.json({
      success: true,
      message: 'Chat assigned successfully',
      data: chat
    });
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign chat' });
  }
});

router.put('/chats/:id/transfer', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Verify the chat is assigned to current agent
    if (chat.agent_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only transfer chats assigned to you' });
    }

    // Verify new agent exists and belongs to same tenant
    const newAgent = await User.findOne({
      where: { 
        id: agentId, 
        tenant_id: tenantId,
        role: 'agent'
      }
    });

    if (!newAgent) {
      return res.status(400).json({ success: false, message: 'Invalid agent' });
    }

    // Transfer chat
    await chat.update({
      agent_id: agentId,
      status: 'transferred'
    });

    // Create system message
    const systemMessage = await Message.create({
      chat_id: id,
      sender_id: req.user.id,
      sender_type: 'system',
      message: `Chat transferred from ${req.user.name} to ${newAgent.name}`,
      message_type: 'system'
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${id}`).emit('chat_transferred', {
        chat: chat.toJSON(),
        transferMessage: systemMessage.toJSON(),
        transferredBy: req.user.toJSON(),
        transferredTo: newAgent.toJSON()
      });

      // Notify new agent
      io.to(`user_${agentId}`).emit('chat_assigned', {
        chat: chat.toJSON(),
        assignedBy: req.user.toJSON()
      });
    }

    res.json({
      success: true,
      message: 'Chat transferred successfully',
      data: chat
    });
  } catch (error) {
    console.error('Transfer chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to transfer chat' });
  }
});

router.put('/chats/:id/end', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if agent can end this chat
    if (req.user.role === 'agent' && chat.agent_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await chat.update({
      status: 'closed',
      ended_at: new Date(),
      rating,
      rating_feedback: feedback
    });

    res.json({
      success: true,
      message: 'Chat ended successfully',
      data: chat
    });
  } catch (error) {
    console.error('End chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to end chat' });
  }
});

// Tickets management
router.get('/tickets', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { tenant_id: tenantId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    // If user is an agent, only show tickets assigned to them or unassigned tickets
    if (req.user.role === 'agent') {
      whereClause[require('sequelize').Op.or] = [
        { agent_id: req.user.id },
        { agent_id: null }
      ];
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const ticket = await Ticket.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

router.post('/tickets', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const ticketData = { ...req.body, tenant_id: tenantId };
    
    const ticket = await Ticket.create(ticketData);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
});

router.put('/tickets/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const ticket = await Ticket.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await ticket.update(req.body);
    
    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

router.put('/tickets/:id/assign', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const ticket = await Ticket.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await ticket.update({
      agent_id: req.user.id,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign ticket' });
  }
});

// Agent settings
router.get('/settings', authenticateToken, requireAgent, async (req, res) => {
  try {
    let settings = await AgentSetting.findOne({
      where: { agent_id: req.user.id }
    });

    if (!settings) {
      // Create default settings
      settings = await AgentSetting.create({
        agent_id: req.user.id,
        notification_sound_enabled: true,
        notification_sound: 'default',
        notification_volume: 0.5,
        notification_preferences: {
          new_chat: true,
          new_message: true,
          chat_transfer: true,
          ai_alert: true,
          ticket_assigned: true,
          system_announcement: false
        },
        theme: 'light',
        language: 'en',
        auto_accept_chats: false,
        max_concurrent_chats: 5,
        ai_suggestions_enabled: true,
        grammar_check_enabled: true
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get agent settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.put('/settings', authenticateToken, requireAgent, async (req, res) => {
  try {
    const [settings] = await AgentSetting.upsert({
      agent_id: req.user.id,
      ...req.body
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update agent settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// File upload (placeholder)
router.post('/files/upload', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    // This would integrate with storage service (R2/Wasabi)
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'File upload endpoint - to be implemented with storage service',
      data: {
        url: 'placeholder-url',
        filename: req.body.filename || 'uploaded-file',
        size: req.body.size || 0
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

// Visitor management
router.get('/visitors', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const agentId = req.user.id;
    const { status, device, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get agent's assigned brands
    const { BrandAgent } = require('../../models');
    const assignedBrands = await BrandAgent.findAll({
      where: {
        agent_id: agentId,
        status: 'active'
      },
      attributes: ['brand_id']
    });

    const assignedBrandIds = assignedBrands.map(ba => ba.brand_id);

    const whereClause = { 
      tenant_id: tenantId,
      is_active: true 
    };

    // Filter by assigned brands (if agent has brand assignments)
    if (assignedBrandIds.length > 0) {
      whereClause.brand_id = { [Op.in]: assignedBrandIds };
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (device && device !== 'all') {
      whereClause['device.type'] = device;
    }

    const { count, rows: visitors } = await Visitor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedAgent',
          attributes: ['id', 'name', 'avatar'],
          required: false
        },
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name', 'primary_color'],
          required: false
        }
      ],
      order: [['last_activity', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Apply search filter if provided
    let filteredVisitors = visitors;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredVisitors = visitors.filter(visitor => 
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.email?.toLowerCase().includes(searchTerm) ||
        visitor.current_page?.toLowerCase().includes(searchTerm) ||
        visitor.location?.city?.toLowerCase().includes(searchTerm)
      );
    }

    // Transform visitor data to match frontend interface
    const transformedVisitors = filteredVisitors.map(visitor => ({
      id: visitor.id,
      name: visitor.name || 'Anonymous Visitor',
      email: visitor.email,
      phone: visitor.phone,
      avatar: visitor.avatar,
      status: visitor.status,
      currentPage: visitor.current_page || 'Unknown page',
      referrer: visitor.referrer || 'Direct',
      ipAddress: visitor.ip_address || 'Unknown',
      location: visitor.location || { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
      device: visitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
      lastActivity: visitor.last_activity,
      sessionDuration: visitor.session_duration ? visitor.session_duration.toString() : '0',
      messagesCount: visitor.messages_count || 0,
      visitsCount: visitor.visits_count || 1,
      isTyping: visitor.is_typing || false,
      assignedAgent: visitor.assignedAgent,
      brand: visitor.brand ? {
        id: visitor.brand.id,
        name: visitor.brand.name,
        primaryColor: visitor.brand.primary_color
      } : null,
      brandName: visitor.brand?.name || 'No Brand',
      tags: visitor.tags || [],
      notes: visitor.notes,
      createdAt: visitor.created_at,
      updatedAt: visitor.updated_at,
      lastWidgetUpdate: visitor.last_widget_update
    }));

    res.json({
      success: true,
      data: transformedVisitors,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitors' });
  }
});

router.get('/visitors/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const visitor = await Visitor.findOne({
      where: { 
        id, 
        tenant_id: tenantId 
      },
      include: [
        {
          model: User,
          as: 'assignedAgent',
          attributes: ['id', 'name', 'avatar', 'email'],
          required: false
        }
      ]
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    res.json({
      success: true,
      data: visitor
    });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitor' });
  }
});

router.put('/visitors/:id/assign', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const tenantId = req.user.tenant_id;

    const visitor = await Visitor.findOne({
      where: { 
        id, 
        tenant_id: tenantId 
      }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Verify agent exists and belongs to same tenant
    if (agentId) {
      const agent = await User.findOne({
        where: { 
          id: agentId, 
          tenant_id: tenantId,
          role: 'agent'
        }
      });

      if (!agent) {
        return res.status(400).json({ success: false, message: 'Invalid agent' });
      }
    }

    await visitor.update({ assigned_agent_id: agentId || null });

    res.json({
      success: true,
      message: agentId ? 'Visitor assigned to agent' : 'Visitor unassigned'
    });
  } catch (error) {
    console.error('Assign visitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign visitor' });
  }
});

router.put('/visitors/:id/status', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.user.tenant_id;

    const validStatuses = ['online', 'away', 'offline', 'idle'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const visitor = await Visitor.findOne({
      where: { 
        id, 
        tenant_id: tenantId 
      }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    await visitor.update({ 
      status,
      last_activity: new Date()
    });

    res.json({
      success: true,
      message: 'Visitor status updated'
    });
  } catch (error) {
    console.error('Update visitor status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor status' });
  }
});

router.put('/visitors/:id/notes', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tenantId = req.user.tenant_id;

    const visitor = await Visitor.findOne({
      where: { 
        id, 
        tenant_id: tenantId 
      }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    await visitor.update({ notes });

    res.json({
      success: true,
      message: 'Visitor notes updated'
    });
  } catch (error) {
    console.error('Update visitor notes error:', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor notes' });
  }
});

// Get chat messages for a visitor with pagination support and caching
router.get('/visitors/:id/messages', authenticateToken, requireAgent, requireTenant, cacheMiddleware(180), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const agentId = req.user.id;
    const { limit = 100, before, after } = req.query;

    // Get agent's assigned brands
    const { BrandAgent } = require('../../models');
    const assignedBrands = await BrandAgent.findAll({
      where: {
        agent_id: agentId,
        status: 'active'
      },
      attributes: ['brand_id']
    });

    const assignedBrandIds = assignedBrands.map(ba => ba.brand_id);

    // First, verify the visitor belongs to one of the agent's assigned brands
    const visitor = await Visitor.findOne({
      where: {
        id: id,
        tenant_id: tenantId,
        is_active: true
      },
      attributes: ['id', 'brand_id']
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Check if visitor belongs to agent's assigned brands
    if (assignedBrandIds.length > 0 && !assignedBrandIds.includes(visitor.brand_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: Visitor not in assigned brands' });
    }

    // Build where clause for pagination
    const whereClause = {
      visitor_id: id,
      tenant_id: tenantId
    };

    if (before) {
      whereClause.created_at = { [Op.lt]: new Date(before) };
    }

    // Get visitor messages from database with pagination
    const { count, rows: messages } = await VisitorMessage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatar'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      distinct: true
    });

    // Determine if there are more messages
    const hasMore = count > parseInt(limit);

    // Transform messages to match frontend format
    const transformedMessages = messages.map(msg => ({
      id: msg.id.toString(),
      content: msg.message,
      sender: msg.sender_type,
      senderName: msg.sender_name,
      timestamp: msg.created_at,
      visitorId: msg.visitor_id,
      isRead: msg.is_read,
      readAt: msg.read_at,
      messageType: msg.message_type,
      metadata: msg.metadata
    }));

    const response = {
      success: true,
      data: {
        messages: transformedMessages,
        hasMore,
        total: count,
        nextCursor: messages.length > 0 ? messages[messages.length - 1].created_at : null
      }
    };

    // Cache last 100 messages for quick access
    if (!before && transformedMessages.length > 0) {
      const cacheKey = `visitor:messages:${id}`;
      await cache.set(cacheKey, transformedMessages.slice(-100), 300);
    }

    res.json(response);
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages' });
  }
});

// Send message to visitor
router.post('/visitors/:id/messages', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, sender = 'agent' } = req.body;
    const tenantId = req.user.tenant_id;
    const agentId = req.user.id;

    console.log('Agent message endpoint called:', { 
      visitorId: id, 
      message, 
      sender, 
      agentId: agentId, 
      agentName: req.user.name,
      tenantId 
    });

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Get agent's assigned brands
    const { BrandAgent } = require('../../models');
    const assignedBrands = await BrandAgent.findAll({
      where: {
        agent_id: agentId,
        status: 'active'
      },
      attributes: ['brand_id']
    });

    const assignedBrandIds = assignedBrands.map(ba => ba.brand_id);

    // Verify the visitor belongs to one of the agent's assigned brands
    const visitor = await Visitor.findOne({
      where: {
        id: id,
        tenant_id: tenantId,
        is_active: true
      },
      attributes: ['id', 'brand_id']
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Check if visitor belongs to agent's assigned brands
    if (assignedBrandIds.length > 0 && !assignedBrandIds.includes(visitor.brand_id)) {
      return res.status(403).json({ success: false, message: 'Access denied: Visitor not in assigned brands' });
    }

    // Store agent message in database
    const messageRecord = await VisitorMessage.create({
      visitor_id: id,
      tenant_id: tenantId,
      sender_type: 'agent',
      sender_id: req.user.id,
      sender_name: req.user.name,
      message: message,
      message_type: 'text',
      is_read: false,
      metadata: {}
    });

    console.log('Agent message stored in database:', messageRecord.id);

    // Emit socket event to send message to visitor
    const io = req.app.get('io');
    if (io) {
      const socketData = {
        visitorId: id,
        message: message,
        sender: 'agent',
        agentId: req.user.id,
        agentName: req.user.name,
        timestamp: messageRecord.created_at,
        messageId: messageRecord.id.toString()
      };
      
      // Send to specific visitor room
      io.to(`visitor_${id}`).emit('agent:message', socketData);
      
      // Also broadcast to agent rooms for monitoring (not to all sockets)
      io.to(`tenant_${tenantId}`).emit('agent:message', socketData);
    } else {
      console.log('Socket.io not available for agent message');
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: messageRecord.id.toString(),
        content: messageRecord.message,
        sender: messageRecord.sender_type,
        senderName: messageRecord.sender_name,
        timestamp: messageRecord.created_at,
        visitorId: id
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Update visitor profile
router.put('/visitors/:id/profile', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes, tags } = req.body;
    const tenantId = req.user.tenant_id;

    const visitor = await Visitor.findOne({
      where: { 
        id, 
        tenant_id: tenantId 
      }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    await visitor.update({
      name: name || visitor.name,
      email: email || visitor.email,
      phone: phone || visitor.phone,
      notes: notes || visitor.notes,
      tags: tags || visitor.tags
    });

    res.json({
      success: true,
      message: 'Visitor profile updated successfully'
    });
  } catch (error) {
    console.error('Update visitor profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor profile' });
  }
});

// Agent join chat (disconnect AI)
router.post('/visitors/:id/agent-join', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId, agentName } = req.body;
    const tenantId = req.user.tenant_id;

    // Update visitor to assign agent and disable AI
    const visitor = await Visitor.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Update visitor with assigned agent
    await visitor.update({
      assigned_agent_id: agentId,
      status: 'online' // Set to online when agent joins
    });

    // Emit socket event to notify widget that AI should be disabled
    const io = req.app.get('io');
    if (io) {
      const joinData = {
        visitorId: id,
        agentId: agentId,
        agentName: agentName,
        tenantId: tenantId
      };
      // Send to specific visitor room
      io.to(`visitor_${id}`).emit('agent:join', joinData);
      
      // Also broadcast to agents for monitoring
      io.to(`tenant_${tenantId}`).emit('agent:join', joinData);
    }

    res.json({
      success: true,
      message: 'Agent joined chat successfully',
      data: {
        visitorId: id,
        agentId: agentId,
        agentName: agentName
      }
    });
  } catch (error) {
    console.error('Agent join error:', error);
    res.status(500).json({ success: false, message: 'Failed to join chat' });
  }
});

// Agent leave chat (re-enable AI)
router.post('/visitors/:id/agent-leave', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId, agentName } = req.body;
    const tenantId = req.user.tenant_id;

    // Update visitor to remove assigned agent and re-enable AI
    const visitor = await Visitor.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Update visitor to remove assigned agent
    await visitor.update({
      assigned_agent_id: null,
      status: 'idle' // Set to idle when agent leaves
    });

    // Emit socket event to notify widget that AI should be re-enabled
    const io = req.app.get('io');
    if (io) {
      const leaveData = {
        visitorId: id,
        agentId: agentId,
        agentName: agentName,
        tenantId: tenantId
      };
      // Send to specific visitor room
      io.to(`visitor_${id}`).emit('agent:leave', leaveData);
      
      // Send to agent dashboard for monitoring (only to agents, not visitors)
      io.to(`tenant_${tenantId}`).emit('agent:leave', leaveData);
    }

    res.json({
      success: true,
      message: 'Agent left chat successfully',
      data: {
        visitorId: id,
        agentId: agentId,
        agentName: agentName
      }
    });
  } catch (error) {
    console.error('Agent leave error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave chat' });
  }
});

// Get visitor activity log
router.get('/visitors/:id/activities', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = req.user.tenant_id;

    // Build where clause for date filtering
    const whereClause = { 
      visitor_id: id,
      tenant_id: tenantId 
    };

    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const activities = await VisitorActivity.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: 100 // Limit to last 100 activities
    });

    // Transform activities for frontend
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      description: getActivityDescription(activity),
      timestamp: activity.timestamp,
      details: {
        ip: activity.activity_data?.ip_address || '',
        city: activity.activity_data?.location?.city || '',
        country: activity.activity_data?.location?.country || '',
        browser: activity.activity_data?.device?.browser || '',
        url: activity.page_url || '',
        referrer: activity.activity_data?.referrer || ''
      }
    }));

    res.json({
      success: true,
      data: transformedActivities
    });
  } catch (error) {
    console.error('Get visitor activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitor activities' });
  }
});

// Update agent presence status
router.put('/status', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { presence_status } = req.body;
    const validStatuses = ['online', 'away', 'invisible'];
    
    if (!presence_status || !validStatuses.includes(presence_status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid presence status. Must be online, away, or invisible' 
      });
    }
    
    const oldStatus = req.user.agent_presence_status;
    
    // Update agent's presence status
    await User.update(
      { agent_presence_status: presence_status },
      { where: { id: req.user.id } }
    );
    
    // Handle chat reassignment if status changed
    if (oldStatus !== presence_status) {
      const { handleAgentStatusChange } = require('../../services/triggerService');
      await handleAgentStatusChange(req.user.id, presence_status, req.user.tenant_id);
    }
    
    // Emit socket event to notify other users
    if (req.io) {
      req.io.to(`tenant_${req.user.tenant_id}`).emit('agent:status:changed', {
        agentId: req.user.id,
        agentName: req.user.name,
        presenceStatus: presence_status,
        oldStatus: oldStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Agent presence status updated',
      data: { 
        presence_status,
        old_status: oldStatus
      }
    });
    
  } catch (error) {
    console.error('Update agent status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update agent status' });
  }
});

// Get agent presence status
router.get('/status', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const agent = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'agent_presence_status', 'last_login']
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        presence_status: agent.agent_presence_status || 'online',
        last_login: agent.last_login
      }
    });
    
  } catch (error) {
    console.error('Get agent status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent status' });
  }
});

// Get all agents' presence status for the tenant
router.get('/agents/status', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { 
        tenant_id: req.user.tenant_id,
        role: 'agent',
        status: 'active'
      },
      attributes: ['id', 'name', 'agent_presence_status', 'last_login'],
      order: [['name', 'ASC']]
    });
    
    // Get workload information for each agent
    const agentsWithWorkload = await Promise.all(agents.map(async (agent) => {
      const activeChatsCount = await Chat.count({
        where: {
          agent_id: agent.id,
          status: 'active',
          tenant_id: req.user.tenant_id
        }
      });
      
      return {
        id: agent.id,
        name: agent.name,
        presence_status: agent.agent_presence_status || 'online',
        last_login: agent.last_login,
        active_chats: activeChatsCount
      };
    }));
    
    res.json({
      success: true,
      data: agentsWithWorkload
    });
    
  } catch (error) {
    console.error('Get agents status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agents status' });
  }
});

// Get agent workload information
router.get('/workload', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { getAvailableAgents } = require('../../services/triggerService');
    
    const availableAgents = await getAvailableAgents(req.user.tenant_id);
    const waitingChatsCount = await Chat.count({
      where: {
        agent_id: null,
        status: 'waiting',
        tenant_id: req.user.tenant_id
      }
    });
    
    res.json({
      success: true,
      data: {
        available_agents: availableAgents.length,
        waiting_chats: waitingChatsCount,
        agents: availableAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          current_chats: agent.currentChatsCount,
          max_chats: agent.maxChats,
          availability: agent.maxChats - agent.currentChatsCount
        }))
      }
    });
    
  } catch (error) {
    console.error('Get agent workload error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent workload' });
  }
});

// Helper function to generate activity descriptions
function getActivityDescription(activity) {
  const data = activity.activity_data || {};
  
  switch (activity.activity_type) {
    case 'page_view':
      return `Viewed page: ${data.page_title || 'Unknown Page'}`;
    case 'chat_start':
      return 'Started a chat session';
    case 'chat_message':
      return `Sent message: ${data.message?.substring(0, 50) || 'Message'}${data.message?.length > 50 ? '...' : ''}`;
    case 'widget_open':
      return 'Opened chat widget';
    case 'widget_close':
      return 'Closed chat widget';
    case 'typing_start':
      return 'Started typing';
    case 'typing_stop':
      return 'Stopped typing';
    case 'agent_join':
      return `Agent ${data.agent_name || 'Unknown'} joined the chat`;
    case 'agent_leave':
      return `Agent ${data.agent_name || 'Unknown'} left the chat`;
    case 'file_upload':
      return `Uploaded file: ${data.filename || 'Unknown file'}`;
    case 'form_submit':
      return `Submitted form: ${data.form_name || 'Unknown form'}`;
    default:
      return `Activity: ${activity.activity_type}`;
  }
}

// ==================== TRIGGERS ROUTES ====================

// Get agent's triggers
router.get('/triggers', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const triggers = await Trigger.findAll({
      where: { tenant_id: tenantId },
      order: [['priority', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: triggers
    });
  } catch (error) {
    console.error('Get agent triggers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch triggers' });
  }
});

// Create new trigger
router.post('/triggers', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { name, description, trigger_type, conditions, actions, priority, status } = req.body;

    // Validate required fields
    if (!name || !trigger_type || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        message: 'Name, trigger type, conditions, and actions are required'
      });
    }

    // Validate trigger type
    const validTypes = ['message', 'time', 'visitor', 'chat_status'];
    if (!validTypes.includes(trigger_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trigger type'
      });
    }

    // Validate conditions structure
    if (!conditions.field || !conditions.operator) {
      return res.status(400).json({
        success: false,
        message: 'Conditions must have field and operator'
      });
    }

    // Validate actions array
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Actions must be a non-empty array'
      });
    }

    const trigger = await Trigger.create({
      tenant_id: tenantId,
      name,
      description: description || null,
      trigger_type,
      conditions,
      actions,
      priority: priority || 1,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Trigger created successfully',
      data: trigger
    });
  } catch (error) {
    console.error('Create trigger error:', error);
    res.status(500).json({ success: false, message: 'Failed to create trigger' });
  }
});

// Update trigger
router.put('/triggers/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { name, description, trigger_type, conditions, actions, priority, status } = req.body;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }

    // Validate trigger type if provided
    if (trigger_type) {
      const validTypes = ['message', 'time', 'visitor', 'chat_status'];
      if (!validTypes.includes(trigger_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger type'
        });
      }
    }

    // Validate conditions if provided
    if (conditions) {
      if (!conditions.field || !conditions.operator) {
        return res.status(400).json({
          success: false,
          message: 'Conditions must have field and operator'
        });
      }
    }

    // Validate actions if provided
    if (actions) {
      if (!Array.isArray(actions) || actions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Actions must be a non-empty array'
        });
      }
    }

    await trigger.update({
      name: name || trigger.name,
      description: description !== undefined ? description : trigger.description,
      trigger_type: trigger_type || trigger.trigger_type,
      conditions: conditions || trigger.conditions,
      actions: actions || trigger.actions,
      priority: priority !== undefined ? priority : trigger.priority,
      status: status || trigger.status
    });

    res.json({
      success: true,
      message: 'Trigger updated successfully',
      data: trigger
    });
  } catch (error) {
    console.error('Update trigger error:', error);
    res.status(500).json({ success: false, message: 'Failed to update trigger' });
  }
});

// Delete trigger
router.delete('/triggers/:id', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }

    await trigger.destroy();

    res.json({
      success: true,
      message: 'Trigger deleted successfully'
    });
  } catch (error) {
    console.error('Delete trigger error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete trigger' });
  }
});

// Toggle trigger status
router.patch('/triggers/:id/toggle', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }

    const newStatus = trigger.status === 'active' ? 'inactive' : 'active';
    await trigger.update({ status: newStatus });

    res.json({
      success: true,
      message: `Trigger ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: { ...trigger.toJSON(), status: newStatus }
    });
  } catch (error) {
    console.error('Toggle trigger status error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle trigger status' });
  }
});

// Get trigger statistics
router.get('/triggers/stats', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const totalTriggers = await Trigger.count({ where: { tenant_id: tenantId } });
    const activeTriggers = await Trigger.count({ 
      where: { tenant_id: tenantId, status: 'active' } 
    });
    const inactiveTriggers = await Trigger.count({ 
      where: { tenant_id: tenantId, status: 'inactive' } 
    });

    // Count by trigger type
    const triggersByType = await Trigger.findAll({
      where: { tenant_id: tenantId },
      attributes: ['trigger_type'],
      group: ['trigger_type'],
      raw: true
    });

    const typeStats = {};
    triggersByType.forEach(trigger => {
      typeStats[trigger.trigger_type] = (typeStats[trigger.trigger_type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total_triggers: totalTriggers,
        active_triggers: activeTriggers,
        inactive_triggers: inactiveTriggers,
        triggers_by_type: typeStats
      }
    });
  } catch (error) {
    console.error('Get trigger stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trigger statistics' });
  }
});

// Search triggers for live suggestions
router.post('/triggers/search', authenticateToken, requireAgent, requireTenant, async (req, res) => {
  try {
    const { searchText } = req.body;
    const tenantId = req.user.tenant_id;

    if (!searchText || searchText.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const text = searchText.toLowerCase();

    // Fetch all active triggers for the tenant
    const triggers = await Trigger.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active'
      }
    });

    // Filter triggers that match the search text
    const matchedTriggers = triggers.filter(trigger => {
      const nameMatch = trigger.name.toLowerCase().includes(text);
      
      // Check if any action contains matching text
      let actionMatch = false;
      if (trigger.actions && Array.isArray(trigger.actions)) {
        actionMatch = trigger.actions.some(action => {
          if (action.message && typeof action.message === 'string') {
            return action.message.toLowerCase().includes(text);
          }
          return false;
        });
      }
      
      return nameMatch || actionMatch;
    }).map(trigger => {
      // Extract the first message from actions for display
      let messageContent = '';
      if (trigger.actions && Array.isArray(trigger.actions) && trigger.actions.length > 0) {
        const firstAction = trigger.actions[0];
        if (firstAction.message && typeof firstAction.message === 'string') {
          messageContent = firstAction.message;
        }
      }
      
      return {
        id: trigger.id,
        name: trigger.name,
        description: trigger.description,
        message: messageContent,
        priority: trigger.priority,
        isFavorite: trigger.priority > 5
      };
    });

    // Sort by favorite status and priority
    matchedTriggers.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.priority - a.priority;
    });

    // Limit to top 5 suggestions
    const suggestions = matchedTriggers.slice(0, 5);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error searching triggers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search triggers'
    });
  }
});

module.exports = router;