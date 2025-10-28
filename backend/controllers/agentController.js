const { User, Company, Plan, Department, Chat, Message, Trigger, AITrainingDoc, Notification, CallSession, Ticket, AgentSetting, WidgetSetting } = require('../models');

// Get chats
const getChats = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, department_id } = req.query;

    const whereClause = { tenant_id: tenantId };
    if (status) whereClause.status = status;
    if (department_id) whereClause.department_id = department_id;

    const chats = await Chat.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats'
    });
  }
};

// Get chat by ID
const getChatById = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat'
    });
  }
};

// Assign chat to agent
const assignChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await chat.update({ 
      agent_id,
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Chat assigned successfully',
      data: chat
    });
  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign chat'
    });
  }
};

// End chat
const endChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, rating_feedback } = req.body;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await chat.update({ 
      status: 'closed',
      ended_at: new Date(),
      rating,
      rating_feedback
    });

    res.json({
      success: true,
      message: 'Chat ended successfully',
      data: chat
    });
  } catch (error) {
    console.error('End chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end chat'
    });
  }
};

// Get tickets
const getTickets = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, priority, department_id } = req.query;

    const whereClause = { tenant_id: tenantId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (department_id) whereClause.department_id = department_id;

    const tickets = await Ticket.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tickets'
    });
  }
};

// Get ticket by ID
const getTicketById = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket'
    });
  }
};

// Create ticket
const createTicket = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
};

// Update ticket
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const ticketData = req.body;

    const ticket = await Ticket.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.update(ticketData);

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket'
    });
  }
};

// Assign ticket
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;
    const tenantId = req.user.tenant_id;

    const ticket = await Ticket.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.update({ 
      agent_id,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket'
    });
  }
};

// Get agent settings
const getAgentSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let agentSettings = await AgentSetting.findOne({
      where: { agent_id: userId }
    });

    // Create default settings if none exist
    if (!agentSettings) {
      agentSettings = await AgentSetting.create({
        agent_id: userId,
        notification_sound: 'default',
        notification_volume: 0.5,
        notification_preferences: {},
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
      data: agentSettings
    });
  } catch (error) {
    console.error('Get agent settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent settings'
    });
  }
};

// Update agent settings
const updateAgentSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = req.body;

    let agentSettings = await AgentSetting.findOne({
      where: { agent_id: userId }
    });

    if (!agentSettings) {
      agentSettings = await AgentSetting.create({
        agent_id: userId,
        ...settingsData
      });
    } else {
      await agentSettings.update(settingsData);
    }

    res.json({
      success: true,
      message: 'Agent settings updated successfully',
      data: agentSettings
    });
  } catch (error) {
    console.error('Update agent settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent settings'
    });
  }
};

// Upload file
const uploadFile = async (req, res) => {
  try {
    // TODO: Implement file upload logic
    res.json({
      success: true,
      message: 'File upload functionality coming soon',
      data: { url: 'placeholder-url' }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
};

module.exports = {
  getChats,
  getChatById,
  assignChat,
  endChat,
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  getAgentSettings,
  updateAgentSettings,
  uploadFile
};