const express = require('express');
const router = express.Router();
const { authenticateToken, requireCompanyAdmin } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantAuth');
const { requireFeatureAccess } = require('../../middleware/featureAccess');
const { Department, User, Chat, Message, Trigger, WidgetSetting, Ticket, Company, Plan, AITrainingDoc, Brand, AgentSetting } = require('../../models');
const { Op } = require('sequelize');

// Simple initials avatar generator (SVG data URL)
function generateInitialsAvatar(name) {
  try {
    const safeName = (name || '').trim();
    const parts = safeName.split(/\s+/).filter(Boolean);
    const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
    // Deterministic background color from name
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    const bg = `hsl(${hue}, 70%, 45%)`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">\n  <rect width="128" height="128" rx="16" ry="16" fill="${bg}"/>\n  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" fill="#ffffff">${initials}</text>\n</svg>`;
    const encoded = encodeURIComponent(svg)
      // Encode parentheses explicitly to avoid some URL parsers issues
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
    return `data:image/svg+xml;utf8,${encoded}`;
  } catch (_e) {
    return null;
  }
}

// Dashboard
router.get('/dashboard', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { Op } = require('sequelize');

    const [
      totalAgents,
      activeChats,
      totalTickets,
      totalMessages,
      recentChats,
      recentTickets,
      allAgents,
      completedChats
    ] = await Promise.all([
      User.count({ where: { tenant_id: tenantId, role: 'agent' } }),
      Chat.count({ where: { tenant_id: tenantId, status: 'active' } }),
      Ticket.count({ where: { tenant_id: tenantId } }),
      Message.count({
        include: [{ model: Chat, as: 'chat', where: { tenant_id: tenantId } }]
      }),
      Chat.findAll({
        where: { tenant_id: tenantId },
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'avatar'], required: false },
          { model: User, as: 'agent', attributes: ['id', 'name', 'email'], required: false }
        ],
        attributes: ['id', 'status', 'created_at', 'started_at', 'customer_id', 'agent_id', 'customer_name', 'customer_email']
      }),
      Ticket.findAll({
        where: { tenant_id: tenantId },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'agent', attributes: ['id', 'name', 'email'] }
        ]
      }),
      User.findAll({
        where: { tenant_id: tenantId, role: 'agent' },
        attributes: ['id', 'name', 'email', 'agent_presence_status', 'status']
      }),
      Chat.findAll({
        where: { 
          tenant_id: tenantId,
          status: { [Op.in]: ['closed', 'completed'] },
          started_at: { [Op.ne]: null },
          agent_id: { [Op.ne]: null }
        },
        attributes: ['id', 'status', 'started_at', 'ended_at', 'agent_id', 'customer_id', 'created_at'],
        include: [
          { 
            model: Message, 
            as: 'messages',
            separate: true,
            order: [['created_at', 'ASC']],
            limit: 100,
            attributes: ['id', 'content', 'sender_type', 'sender_id', 'created_at'],
            include: [
              { model: User, as: 'sender', attributes: ['id', 'role'] }
            ]
          }
        ]
      })
    ]);

    // Calculate active agents (online or away)
    const activeAgents = allAgents.filter(agent => 
      agent.agent_presence_status === 'online' && agent.status === 'active'
    ).length;

    // Calculate average response time (time from customer message to first agent response)
    let averageResponseTime = 120; // Default to 120 seconds
    if (completedChats.length > 0) {
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const chat of completedChats) {
        if (!chat.messages || chat.messages.length === 0) continue;

        if (chat.messages && chat.messages.length > 0) {
          let customerMessageTime = null;
          for (const message of chat.messages) {
            // Check if message is from customer/visitor
            const isCustomerMessage = message.sender_type === 'customer' || 
                                     (message.sender && message.sender.role === 'customer');
            
            // Check if message is from agent
            const isAgentMessage = message.sender_type === 'agent' ||
                                  (message.sender && (message.sender.role === 'agent' || message.sender.role === 'company_admin'));

            if (isCustomerMessage) {
              customerMessageTime = new Date(message.created_at);
            } else if (customerMessageTime && isAgentMessage) {
              const agentResponseTime = new Date(message.created_at);
              const responseTime = (agentResponseTime - customerMessageTime) / 1000; // in seconds
              if (responseTime > 0 && responseTime < 3600) { // Valid response time (less than 1 hour)
                totalResponseTime += responseTime;
                responseCount++;
                customerMessageTime = null; // Reset to find next customer message
              }
            }
          }
        }
      }

      if (responseCount > 0) {
        averageResponseTime = Math.round(totalResponseTime / responseCount);
      }
    }

    // Calculate customer satisfaction (average rating from chats)
    let customerSatisfaction = 4.2; // Default
    const ratedChats = completedChats.filter(chat => chat.rating && chat.rating > 0);
    if (ratedChats.length > 0) {
      const totalRating = ratedChats.reduce((sum, chat) => sum + chat.rating, 0);
      customerSatisfaction = Math.round((totalRating / ratedChats.length) * 10) / 10;
    }

    // Calculate trends (compare current period with previous period)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(last30Days.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      currentPeriodChats,
      previousPeriodChats,
      currentPeriodTickets,
      previousPeriodTickets
    ] = await Promise.all([
      Chat.count({
        where: {
          tenant_id: tenantId,
          created_at: { [Op.gte]: last30Days }
        }
      }),
      Chat.count({
        where: {
          tenant_id: tenantId,
          created_at: { [Op.gte]: previous30Days, [Op.lt]: last30Days }
        }
      }),
      Ticket.count({
        where: {
          tenant_id: tenantId,
          created_at: { [Op.gte]: last30Days }
        }
      }),
      Ticket.count({
        where: {
          tenant_id: tenantId,
          created_at: { [Op.gte]: previous30Days, [Op.lt]: last30Days }
        }
      })
    ]);

    const chatsTrend = previousPeriodChats > 0 
      ? Math.round(((currentPeriodChats - previousPeriodChats) / previousPeriodChats) * 100)
      : 0;
    
    const ticketsTrend = previousPeriodTickets > 0
      ? Math.round(((currentPeriodTickets - previousPeriodTickets) / previousPeriodTickets) * 100)
      : 0;

    // Get AI messages usage for real-time tracking
    const VisitorMessage = require('../../models/VisitorMessage');
    const [aiMessagesFromChats, aiMessagesFromVisitors] = await Promise.all([
      Message.count({
        include: [{
          model: Chat,
          as: 'chat',
          where: { tenant_id: tenantId },
          required: true
        }],
        where: { sender_type: 'ai' }
      }),
      VisitorMessage.count({
        where: { 
          tenant_id: tenantId,
          sender_type: 'ai'
        }
      })
    ]);
    const totalAIMessages = aiMessagesFromChats + aiMessagesFromVisitors;

    // Get company plan to get AI messages limit
    const company = await Company.findByPk(tenantId, {
      include: [{ model: Plan, as: 'plan', attributes: ['id', 'max_ai_messages'] }]
    });
    const aiMessagesLimit = company?.plan?.max_ai_messages || 0;
    const aiMessagesUsage = aiMessagesLimit > 0 
      ? ((totalAIMessages / aiMessagesLimit) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        totalAgents,
        activeChats,
        totalTickets,
        totalMessages,
        activeAgents,
        averageResponseTime,
        customerSatisfaction,
        recentChats,
        recentTickets,
        trends: {
          chats: chatsTrend,
          tickets: ticketsTrend
        },
        aiMessages: {
          used: totalAIMessages,
          limit: aiMessagesLimit,
          usagePercentage: parseFloat(aiMessagesUsage)
        }
      }
    });
  } catch (error) {
    console.error('Company dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// Departments management
router.get('/departments', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Fetch departments without include to avoid query issues
    const departments = await Department.findAll({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']]
    });

    // Convert to JSON
    const departmentsData = departments.map(dept => dept.toJSON());

    // Fetch all agent users for this tenant (simplified - fetch all agents, filter in code)
    const allAgents = await User.findAll({
      where: { 
        tenant_id: tenantId,
        role: 'agent'
      },
      attributes: ['id', 'name', 'email', 'role', 'status', 'department_id']
    });

    // Initialize users array for each department
    departmentsData.forEach(dept => {
      dept.users = [];
    });

    // Group agents by department_id
    const departmentIds = departmentsData.map(d => d.id);
    allAgents.forEach(agent => {
      const agentData = agent.toJSON();
      const deptId = agentData.department_id;
      // Only add agents that belong to one of our departments
      if (deptId && departmentIds.includes(deptId)) {
        const dept = departmentsData.find(d => d.id === deptId);
        if (dept) {
          dept.users.push(agentData);
        }
      }
    });

    res.json({
      success: true,
      data: departmentsData
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch departments', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/departments', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Get company plan to check limits
    const company = await Company.findOne({
      where: { id: tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!company || !company.plan) {
      return res.status(404).json({ success: false, message: 'Company or plan not found' });
    }

    // Check department limit (ensure max_departments has a valid value)
    const maxDepartments = company.plan.max_departments ?? 1; // Default to 1 if null/undefined
    const currentDepartmentsCount = await Department.count({ where: { tenant_id: tenantId } });
    
    if (currentDepartmentsCount >= maxDepartments) {
      return res.status(403).json({
        success: false,
        message: `You have reached your department limit of ${maxDepartments}. Please upgrade your plan to create more departments.`,
        limit_reached: true,
        limit_type: 'departments',
        current: currentDepartmentsCount,
        limit: maxDepartments
      });
    }
    
    // Prepare department data - only include valid fields
    const { name, description, status, auto_assign, max_concurrent_chats } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Department name is required' 
      });
    }

    const departmentData = {
      name: name.trim(),
      description: description || null,
      status: status || 'active',
      auto_assign: auto_assign !== undefined ? auto_assign : true,
      max_concurrent_chats: max_concurrent_chats || 5,
      tenant_id: tenantId
    };

    const department = await Department.create(departmentData);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create department',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put('/departments/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const department = await Department.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    await department.update(req.body);
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

router.delete('/departments/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const department = await Department.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    await department.destroy();
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
});

// Agents management
router.get('/agents', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const agents = await User.findAll({
      where: { 
        tenant_id: tenantId, 
        role: 'agent' 
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: AgentSetting, as: 'agentSettings', required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch agents',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/agents', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Get company plan to check limits
    const company = await Company.findOne({
      where: { id: tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!company || !company.plan) {
      return res.status(404).json({ success: false, message: 'Company or plan not found' });
    }

    // Check agent limit
    const currentAgentsCount = await User.count({ 
      where: { tenant_id: tenantId, role: 'agent' } 
    });
    const maxAgents = company.plan?.max_agents;
    if (typeof maxAgents === 'number' && currentAgentsCount >= maxAgents) {
      return res.status(403).json({
        success: false,
        message: `You have reached your agent limit of ${maxAgents}. Please upgrade your plan to create more agents.`,
        limit_reached: true,
        limit_type: 'agents',
        current: currentAgentsCount,
        limit: maxAgents
      });
    }
    
    const { creation_method, password, send_invite, first_name, last_name, ...otherData } = req.body;
    
    // Basic validation
    if (!otherData.email || !otherData.email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if ((!first_name || !first_name.trim()) && (!last_name || !last_name.trim()) && !otherData.name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (creation_method === 'password' && !password) {
      return res.status(400).json({ success: false, message: 'Password is required when using password creation method' });
    }
    
    // Combine first_name and last_name into name field
    const combinedName = `${first_name || ''} ${last_name || ''}`.trim();
    const name = combinedName || otherData.name;
    
    let agentData = { 
      ...otherData,
      name,
      tenant_id: tenantId,
      role: 'agent',
      email_verified: true,
      agent_presence_status: 'invisible'
    };

    // Default avatar with initials when created by admin (if not provided)
    if (!agentData.avatar) {
      const generated = generateInitialsAvatar(name);
      if (generated) {
        agentData.avatar = generated;
      }
    }

    // Handle password or invite creation
    // Normalize creation method: if not provided or invalid, pick a safe default
    const normalizedCreationMethod = ['password', 'invite'].includes(creation_method) 
      ? creation_method 
      : (password ? 'password' : 'invite');

    if (normalizedCreationMethod === 'password') {
      // Password will be hashed by User model's beforeCreate hook
      if (password) {
        agentData.password = password;
      }
    } else if (normalizedCreationMethod === 'invite') {
      // Generate a temporary password and email verification token
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(8).toString('hex');
      
      agentData.password = tempPassword; // Will be hashed by User model's beforeCreate hook
      agentData.email_verified = false;
      agentData.email_verification_token = crypto.randomBytes(32).toString('hex');
      
      // If send_invite is true, send invitation email
      if (send_invite) {
        const { emailService } = require('../../services/emailService');
        try {
          await emailService.sendAgentInvitation(
            agentData.email,
            agentData.name,
            agentData.email_verification_token,
            tempPassword
          );
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Continue with agent creation even if email fails
        }
      }
    }
    
    const agent = await User.create(agentData);

    // Create default agent settings - simplified
    try {
      await AgentSetting.create({
        agent_id: agent.id,
        notification_sound: 'default',
        notification_volume: 0.5,
        notification_preferences: {
          new_chat: true,
          new_message: true,
          chat_transfer: true,
          ai_alert: true,
          ticket_assigned: true,
          system_announcement: false
        }
      });
    } catch (settingsError) {
      console.error('Failed to create agent settings:', settingsError);
      // Continue without settings - agent creation should still succeed
    }

    let message = 'Agent created successfully';
    if (creation_method === 'invite' && send_invite) {
      message = 'Agent created and invitation email sent successfully';
    }

    res.status(201).json({
      success: true,
      message: message,
      data: agent
    });
  } catch (error) {
    console.error('Create agent error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry',
        field: error.errors?.[0]?.path || 'email'
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create agent',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put('/agents/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { first_name, last_name, ...otherData } = req.body;

    const agent = await User.findOne({
      where: { id, tenant_id: tenantId, role: 'agent' }
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Combine first_name and last_name into name field if provided
    const updateData = { ...otherData };
    if (first_name && last_name) {
      updateData.name = `${first_name} ${last_name}`.trim();
    }

    await agent.update(updateData);
    
    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ success: false, message: 'Failed to update agent' });
  }
});

router.delete('/agents/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const agent = await User.findOne({
      where: { id, tenant_id: tenantId, role: 'agent' }
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    await agent.destroy();
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete agent' });
  }
});

// Triggers management
router.get('/triggers', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
    console.error('Get triggers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch triggers' });
  }
});

router.post('/triggers', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const triggerData = { ...req.body, tenant_id: tenantId };
    
    const trigger = await Trigger.create(triggerData);

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

router.put('/triggers/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({ success: false, message: 'Trigger not found' });
    }

    await trigger.update(req.body);
    
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

router.delete('/triggers/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({ success: false, message: 'Trigger not found' });
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

// Company settings
router.get('/settings', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Get company info and widget settings (which contain security settings)
    const [company, widgetSettings] = await Promise.all([
      Company.findByPk(tenantId),
      WidgetSetting.findOne({ where: { tenant_id: tenantId } })
    ]);
    
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Merge company and security settings
    const settings = {
      ...company.toJSON(),
      ...(widgetSettings ? widgetSettings.toJSON() : {})
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch company settings' });
  }
});

router.put('/settings', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const settings = req.body;

    // Update widget settings (which contain security settings)
    const [widgetSettings] = await WidgetSetting.upsert({
      tenant_id: tenantId,
      ...settings
    });

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: widgetSettings
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update company settings' });
  }
});

// Widget settings
router.get('/widget', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

    // Get company plan to check AI access
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

    if (!widgetSettings) {
      // Create default widget settings - AI enabled based on plan
      const hasAIInPlan = company?.plan?.ai_enabled === true;
      widgetSettings = await WidgetSetting.create({
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
        notification_sound_enabled: true,
        notification_sound_file: 'default',
        notification_volume: 0.5,
        auto_maximize_on_message: true
      });
    }

    res.json({
      success: true,
      data: widgetSettings
    });
  } catch (error) {
    console.error('Get widget settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch widget settings' });
  }
});

router.put('/widget', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    // Check if trying to enable AI - verify plan access
    if (req.body.ai_enabled === true) {
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

      if (!company || !company.plan || !company.plan.ai_enabled) {
        return res.status(403).json({
          success: false,
          message: 'AI is not available in your current plan. Please upgrade to access AI features.'
        });
      }
    }
    
    // Prepare update data - explicitly handle all fields
    // Include all fields from req.body, especially ai_welcome_message
    const updateData = {
      tenant_id: tenantId
    };
    
    // Copy all fields from req.body, handling ai_welcome_message specially
    const allowedFields = [
      'theme_color', 'position', 'welcome_message', 'logo_url',
      'enable_audio', 'enable_video', 'enable_file_upload',
      'ai_enabled', 'ai_personality', 'auto_transfer_keywords',
      'ai_welcome_message', 'offline_message', 'custom_css', 'custom_js',
      'notification_sound_enabled', 'notification_sound_file',
      'notification_volume', 'auto_maximize_on_message'
    ];
    
    allowedFields.forEach(field => {
      if (field in req.body) {
        // For ai_welcome_message, allow empty string and convert to null
        if (field === 'ai_welcome_message') {
          updateData[field] = req.body[field] === '' || req.body[field] === null ? null : req.body[field];
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    console.log('Updating widget settings - Request body:', {
      tenant_id: tenantId,
      ai_welcome_message_received: req.body.ai_welcome_message,
      ai_welcome_message_type: typeof req.body.ai_welcome_message,
      has_ai_welcome_message_in_req: 'ai_welcome_message' in req.body,
      allReqKeys: Object.keys(req.body)
    });
    
    console.log('Updating widget settings - Update data:', {
      ai_welcome_message: updateData.ai_welcome_message,
      has_ai_welcome_message: 'ai_welcome_message' in updateData,
      allUpdateFields: Object.keys(updateData)
    });
    
    // Use findOne then update to ensure all fields are saved
    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });
    
    if (widgetSettings) {
      await widgetSettings.update(updateData);
      await widgetSettings.reload();
      
      console.log('After update - ai_welcome_message saved:', widgetSettings.ai_welcome_message);
    } else {
      widgetSettings = await WidgetSetting.create(updateData);
      console.log('After create - ai_welcome_message saved:', widgetSettings.ai_welcome_message);
    }

    res.json({
      success: true,
      message: 'Widget settings updated successfully',
      data: widgetSettings
    });
  } catch (error) {
    console.error('Update widget settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update widget settings' });
  }
});

// Analytics
router.get('/analytics', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalChats,
      totalMessages,
      allAgents,
      completedChats
    ] = await Promise.all([
      Chat.count({ where: { tenant_id: tenantId, created_at: { [require('sequelize').Op.gte]: startDate } } }),
      Message.count({
        include: [{ 
          model: Chat, 
          as: 'chat', 
          where: { 
            tenant_id: tenantId, 
            created_at: { [require('sequelize').Op.gte]: startDate } 
          } 
        }]
      }),
      User.findAll({
        where: { tenant_id: tenantId, role: 'agent' },
        attributes: ['id', 'name', 'email', 'agent_presence_status', 'status']
      }),
      Chat.findAll({
        where: { 
          tenant_id: tenantId,
          status: { [Op.in]: ['closed', 'completed'] },
          started_at: { [Op.ne]: null },
          agent_id: { [Op.ne]: null },
          created_at: { [Op.gte]: startDate }
        },
        include: [
          { 
            model: Message, 
            as: 'messages',
            separate: true,
            order: [['created_at', 'ASC']],
            limit: 100,
            include: [
              { model: User, as: 'sender', attributes: ['id', 'role'] }
            ]
          }
        ]
      })
    ]);

    // Calculate active agents (online or away)
    const activeAgents = allAgents.filter(agent => 
      agent.agent_presence_status === 'online' && agent.status === 'active'
    ).length;

    // Calculate average response time (time from customer message to first agent response)
    let averageResponseTime = 120; // Default to 120 seconds
    if (completedChats.length > 0) {
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const chat of completedChats) {
        if (!chat.messages || chat.messages.length === 0) continue;

        let customerMessageTime = null;
        for (const message of chat.messages) {
          // Check if message is from customer/visitor
          const isCustomerMessage = message.sender_type === 'customer' || 
                                   (message.sender && message.sender.role === 'customer');
          
          // Check if message is from agent
          const isAgentMessage = message.sender_type === 'agent' ||
                                (message.sender && (message.sender.role === 'agent' || message.sender.role === 'company_admin'));

          if (isCustomerMessage) {
            customerMessageTime = new Date(message.created_at);
          } else if (customerMessageTime && isAgentMessage) {
            const agentResponseTime = new Date(message.created_at);
            const responseTime = (agentResponseTime - customerMessageTime) / 1000; // in seconds
            if (responseTime > 0 && responseTime < 3600) { // Valid response time (less than 1 hour)
              totalResponseTime += responseTime;
              responseCount++;
              customerMessageTime = null; // Reset to find next customer message
            }
          }
        }
      }

      if (responseCount > 0) {
        averageResponseTime = Math.round(totalResponseTime / responseCount);
      }
    }

    // Calculate customer satisfaction (average rating from chats)
    let customerSatisfaction = 4.2; // Default
    const ratedChats = completedChats.filter(chat => chat.rating && chat.rating > 0);
    if (ratedChats.length > 0) {
      const totalRating = ratedChats.reduce((sum, chat) => sum + chat.rating, 0);
      customerSatisfaction = Math.round((totalRating / ratedChats.length) * 10) / 10;
    }

    // Generate time intervals based on period
    const intervals = [];
    const intervalCount = period === 'day' ? 24 : period === 'week' ? 7 : 30; // For month, show 30 days
    const intervalType = period === 'day' ? 'hour' : 'day';
    
    for (let i = intervalCount - 1; i >= 0; i--) {
      const date = new Date(now);
      if (intervalType === 'hour') {
        date.setHours(date.getHours() - i);
        date.setMinutes(0, 0, 0);
      } else {
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
      }
      intervals.push(date);
    }

    // Get chats over time
    const chatsOverTime = await Promise.all(
      intervals.map(async (intervalDate, index) => {
        const nextInterval = intervals[index + 1] || now;
        const whereClause = {
          tenant_id: tenantId,
          created_at: {
            [Op.gte]: intervalDate,
            [Op.lt]: nextInterval
          }
        };

        const chats = await Chat.count({ where: whereClause });
        return {
          date: intervalDate,
          chats
        };
      })
    );

    // Get messages over time
    const messagesOverTime = await Promise.all(
      intervals.map(async (intervalDate, index) => {
        const nextInterval = intervals[index + 1] || now;
        const messages = await Message.count({
          include: [{
            model: Chat,
            as: 'chat',
            where: {
              tenant_id: tenantId,
              created_at: {
                [Op.gte]: intervalDate,
                [Op.lt]: nextInterval
              }
            }
          }]
        });
        return {
          date: intervalDate,
          messages
        };
      })
    );

    // Format data for charts
    const formatDateLabel = (date, intervalType) => {
      if (intervalType === 'hour') {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const chatsOverTimeData = chatsOverTime.map((item, index) => ({
      name: formatDateLabel(item.date, intervalType),
      chats: item.chats,
      messages: messagesOverTime[index]?.messages || 0
    }));

    // Get response time over time (daily averages)
    const responseTimeOverTime = await Promise.all(
      intervals.map(async (intervalDate, index) => {
        const nextInterval = intervals[index + 1] || now;
        const dayChats = await Chat.findAll({
          where: {
            tenant_id: tenantId,
            status: { [Op.in]: ['closed', 'completed'] },
            started_at: { [Op.ne]: null },
            agent_id: { [Op.ne]: null },
            created_at: {
              [Op.gte]: intervalDate,
              [Op.lt]: nextInterval
            }
          },
          include: [{
            model: Message,
            as: 'messages',
            separate: true,
            order: [['created_at', 'ASC']],
            limit: 100,
            include: [
              { model: User, as: 'sender', attributes: ['id', 'role'] }
            ]
          }]
        });

        let totalResponseTime = 0;
        let responseCount = 0;

        for (const chat of dayChats) {
          if (!chat.messages || chat.messages.length === 0) continue;
          let customerMessageTime = null;
          for (const message of chat.messages) {
            const isCustomerMessage = message.sender_type === 'customer' || 
                                     (message.sender && message.sender.role === 'customer');
            const isAgentMessage = message.sender_type === 'agent' ||
                                  (message.sender && (message.sender.role === 'agent' || message.sender.role === 'company_admin'));

            if (isCustomerMessage) {
              customerMessageTime = new Date(message.created_at);
            } else if (customerMessageTime && isAgentMessage) {
              const agentResponseTime = new Date(message.created_at);
              const responseTime = (agentResponseTime - customerMessageTime) / 1000;
              if (responseTime > 0 && responseTime < 3600) {
                totalResponseTime += responseTime;
                responseCount++;
                customerMessageTime = null;
              }
            }
          }
        }

        return {
          date: intervalDate,
          time: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null
        };
      })
    );

    const responseTimeData = responseTimeOverTime.map(item => ({
      name: formatDateLabel(item.date, intervalType),
      time: item.time || averageResponseTime
    }));

    // Get chat status distribution
    const [activeChatsCount, closedChatsCount] = await Promise.all([
      Chat.count({
        where: {
          tenant_id: tenantId,
          status: { [Op.in]: ['active', 'waiting'] },
          created_at: { [Op.gte]: startDate }
        }
      }),
      Chat.count({
        where: {
          tenant_id: tenantId,
          status: { [Op.in]: ['closed', 'completed'] },
          created_at: { [Op.gte]: startDate }
        }
      })
    ]);

    const statusDistributionData = [
      { name: 'Active Chats', value: activeChatsCount },
      { name: 'Closed Chats', value: closedChatsCount }
    ];

    // Get agent performance data
    const agentPerformance = await Promise.all(
      allAgents.map(async (agent) => {
        const agentChats = await Chat.findAll({
          where: {
            tenant_id: tenantId,
            agent_id: agent.id,
            created_at: { [Op.gte]: startDate }
          },
          include: [{
            model: Message,
            as: 'messages',
            separate: true,
            order: [['created_at', 'ASC']],
            limit: 100,
            include: [
              { model: User, as: 'sender', attributes: ['id', 'role'] }
            ]
          }]
        });

        let totalResponseTime = 0;
        let responseCount = 0;

        for (const chat of agentChats) {
          if (!chat.messages || chat.messages.length === 0) continue;
          let customerMessageTime = null;
          for (const message of chat.messages) {
            const isCustomerMessage = message.sender_type === 'customer' || 
                                     (message.sender && message.sender.role === 'customer');
            const isAgentMessage = message.sender_type === 'agent' ||
                                  (message.sender && (message.sender.role === 'agent' || message.sender.role === 'company_admin'));

            if (isCustomerMessage) {
              customerMessageTime = new Date(message.created_at);
            } else if (customerMessageTime && isAgentMessage) {
              const agentResponseTime = new Date(message.created_at);
              const responseTime = (agentResponseTime - customerMessageTime) / 1000;
              if (responseTime > 0 && responseTime < 3600) {
                totalResponseTime += responseTime;
                responseCount++;
                customerMessageTime = null;
              }
            }
          }
        }

        const avgResponse = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : averageResponseTime;

        return {
          name: agent.name || `Agent ${agent.id}`,
          chats: agentChats.length,
          response: avgResponse
        };
      })
    );

    // Sort agents by chats handled (descending) and limit to top 10
    const agentPerformanceData = agentPerformance
      .sort((a, b) => b.chats - a.chats)
      .slice(0, 10);

    // Get comprehensive visitor analytics
    const Visitor = require('../../models/Visitor');
    const visitors = await Visitor.findAll({
      where: {
        tenant_id: tenantId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: ['location', 'device', 'source', 'medium', 'referrer', 'session_duration', 'messages_count', 'created_at'],
      raw: true
    });

    // Get chats with more details for conversion analysis
    const chatsWithDetails = await Chat.findAll({
      where: {
        tenant_id: tenantId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: ['id', 'status', 'created_at', 'started_at', 'ended_at', 'rating', 'customer_id'],
      include: [
        {
          model: Message,
          as: 'messages',
          attributes: ['id', 'created_at', 'sender_type'],
          separate: true,
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    // Location analytics
    const countryCounts = {};
    const cityCounts = {};
    
    // Traffic source analytics
    const sourceCounts = {};
    const mediumCounts = {};
    const referrerCounts = {};
    
    // Device analytics
    const deviceTypeCounts = {};
    const browserCounts = {};
    const osCounts = {};
    
    // Hourly patterns (0-23 hours)
    const hourlyActivity = Array.from({ length: 24 }, () => ({ chats: 0, messages: 0, visitors: 0 }));
    
    // Day of week patterns (0 = Sunday, 6 = Saturday)
    const dayOfWeekActivity = Array.from({ length: 7 }, () => ({ chats: 0, messages: 0, visitors: 0 }));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Session duration buckets
    const sessionDurationBuckets = {
      '0-30s': 0,
      '31-60s': 0,
      '1-5min': 0,
      '5-15min': 0,
      '15-30min': 0,
      '30min+': 0
    };
    
    // Total visitors
    const totalVisitors = visitors.length;
    const visitorsWithChats = new Set();
    
    visitors.forEach(visitor => {
      // Location aggregation
      if (visitor.location && typeof visitor.location === 'object') {
        const location = visitor.location;
        const country = location.country || 'Unknown';
        const city = location.city || 'Unknown';
        
        countryCounts[country] = (countryCounts[country] || 0) + 1;
        const cityKey = `${city}, ${country}`;
        cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
      } else {
        countryCounts['Unknown'] = (countryCounts['Unknown'] || 0) + 1;
        cityCounts['Unknown'] = (cityCounts['Unknown'] || 0) + 1;
      }
      
      // Traffic source aggregation
      const source = visitor.source || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      
      const medium = visitor.medium || 'none';
      mediumCounts[medium] = (mediumCounts[medium] || 0) + 1;
      
      const referrer = visitor.referrer || 'Direct';
      if (referrer !== 'Direct' && referrer !== 'null' && referrer) {
        try {
          const url = new URL(referrer);
          const domain = url.hostname.replace('www.', '');
          referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
        } catch {
          referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
        }
      } else {
        referrerCounts['Direct'] = (referrerCounts['Direct'] || 0) + 1;
      }
      
      // Device aggregation
      if (visitor.device && typeof visitor.device === 'object') {
        const deviceType = visitor.device.type || 'desktop';
        deviceTypeCounts[deviceType] = (deviceTypeCounts[deviceType] || 0) + 1;
        
        const browser = visitor.device.browser || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
        
        const os = visitor.device.os || 'Unknown';
        osCounts[os] = (osCounts[os] || 0) + 1;
      } else {
        deviceTypeCounts['desktop'] = (deviceTypeCounts['desktop'] || 0) + 1;
      }
      
      // Hourly pattern
      if (visitor.created_at) {
        const visitorDate = new Date(visitor.created_at);
        const hour = visitorDate.getHours();
        hourlyActivity[hour].visitors++;
      }
      
      // Day of week pattern
      if (visitor.created_at) {
        const visitorDate = new Date(visitor.created_at);
        const dayOfWeek = visitorDate.getDay();
        dayOfWeekActivity[dayOfWeek].visitors++;
      }
      
      // Session duration buckets
      const duration = visitor.session_duration || 0;
      if (duration <= 30) {
        sessionDurationBuckets['0-30s']++;
      } else if (duration <= 60) {
        sessionDurationBuckets['31-60s']++;
      } else if (duration <= 300) {
        sessionDurationBuckets['1-5min']++;
      } else if (duration <= 900) {
        sessionDurationBuckets['5-15min']++;
      } else if (duration <= 1800) {
        sessionDurationBuckets['15-30min']++;
      } else {
        sessionDurationBuckets['30min+']++;
      }
    });
    
    // Process chats for hourly and day patterns
    chatsWithDetails.forEach(chat => {
      if (chat.created_at) {
        const chatDate = new Date(chat.created_at);
        const hour = chatDate.getHours();
        hourlyActivity[hour].chats++;
        
        const dayOfWeek = chatDate.getDay();
        dayOfWeekActivity[dayOfWeek].chats++;
      }
      
      if (chat.messages && chat.messages.length > 0) {
        const lastMessage = chat.messages[0];
        if (lastMessage.created_at) {
          const msgDate = new Date(lastMessage.created_at);
          const hour = msgDate.getHours();
          hourlyActivity[hour].messages++;
          
          const dayOfWeek = msgDate.getDay();
          dayOfWeekActivity[dayOfWeek].messages++;
        }
      }
      
      if (chat.customer_id) {
        visitorsWithChats.add(chat.customer_id);
      }
    });

    // Convert to arrays and sort
    const countryDistribution = Object.entries(countryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const cityDistribution = Object.entries(cityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const trafficSourceDistribution = Object.entries(sourceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const trafficMediumDistribution = Object.entries(mediumCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const referrerDistribution = Object.entries(referrerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const deviceTypeDistribution = Object.entries(deviceTypeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const browserDistribution = Object.entries(browserCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const osDistribution = Object.entries(osCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Format hourly activity data
    const hourlyActivityData = hourlyActivity.map((activity, hour) => ({
      name: `${hour}:00`,
      hour: hour,
      chats: activity.chats,
      messages: activity.messages,
      visitors: activity.visitors
    }));

    // Format day of week activity data
    const dayOfWeekData = dayOfWeekActivity.map((activity, index) => ({
      name: dayNames[index],
      day: index,
      chats: activity.chats,
      messages: activity.messages,
      visitors: activity.visitors
    }));

    // Session duration distribution
    const sessionDurationData = Object.entries(sessionDurationBuckets)
      .map(([name, value]) => ({ name, value }));

    // Calculate conversion metrics
    const visitorToChatConversion = totalVisitors > 0 
      ? ((visitorsWithChats.size / totalVisitors) * 100).toFixed(1)
      : 0;

    // Calculate chat completion rate
    const completedChatsCount = chatsWithDetails.filter(chat => 
      ['closed', 'completed'].includes(chat.status)
    ).length;
    const chatCompletionRate = totalChats > 0 
      ? ((completedChatsCount / totalChats) * 100).toFixed(1)
      : 0;

    // Calculate average session duration
    const totalSessionDuration = visitors.reduce((sum, v) => sum + (v.session_duration || 0), 0);
    const avgSessionDuration = totalVisitors > 0 
      ? Math.round(totalSessionDuration / totalVisitors)
      : 0;

    // Calculate average messages per chat
    const avgMessagesPerChat = totalChats > 0
      ? (totalMessages / totalChats).toFixed(1)
      : 0;

    // Ticket status breakdown
    const ticketStatusBreakdown = await Ticket.findAll({
      where: {
        tenant_id: tenantId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: ['status'],
      raw: true
    });

    const ticketStatusCounts = {};
    ticketStatusBreakdown.forEach(ticket => {
      const status = ticket.status || 'open';
      ticketStatusCounts[status] = (ticketStatusCounts[status] || 0) + 1;
    });

    const ticketStatusDistribution = Object.entries(ticketStatusCounts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    // Department performance (if departments exist)
    const Department = require('../../models/Department');
    const departments = await Department.findAll({
      where: { tenant_id: tenantId },
      attributes: ['id', 'name']
    });

    const departmentPerformance = await Promise.all(
      departments.map(async (dept) => {
        const deptChats = await Chat.count({
          where: {
            tenant_id: tenantId,
            department_id: dept.id,
            created_at: { [Op.gte]: startDate }
          }
        });
        return {
          name: dept.name,
          chats: deptChats
        };
      })
    );

    // Calculate chat resolution time (time from start to end)
    const resolutionTimes = chatsWithDetails
      .filter(chat => chat.started_at && chat.ended_at)
      .map(chat => {
        const start = new Date(chat.started_at);
        const end = new Date(chat.ended_at);
        return (end - start) / 1000 / 60; // in minutes
      })
      .filter(time => time > 0 && time < 1440); // valid times (less than 24 hours)

    const avgResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length)
      : 0;

    res.json({
      success: true,
      data: {
        period,
        totalChats,
        totalMessages,
        averageResponseTime,
        customerSatisfaction,
        activeAgents,
        // Additional metrics
        totalVisitors,
        visitorToChatConversion: parseFloat(visitorToChatConversion),
        chatCompletionRate: parseFloat(chatCompletionRate),
        avgSessionDuration,
        avgMessagesPerChat: parseFloat(avgMessagesPerChat),
        avgResolutionTime,
        charts: {
          chatsOverTime: chatsOverTimeData,
          responseTimeOverTime: responseTimeData,
          statusDistribution: statusDistributionData,
          agentPerformance: agentPerformanceData,
          countryDistribution: countryDistribution,
          cityDistribution: cityDistribution,
          // New charts
          trafficSourceDistribution: trafficSourceDistribution,
          trafficMediumDistribution: trafficMediumDistribution,
          referrerDistribution: referrerDistribution,
          deviceTypeDistribution: deviceTypeDistribution,
          browserDistribution: browserDistribution,
          osDistribution: osDistribution,
          hourlyActivity: hourlyActivityData,
          dayOfWeekActivity: dayOfWeekData,
          sessionDurationDistribution: sessionDurationData,
          ticketStatusDistribution: ticketStatusDistribution,
          departmentPerformance: departmentPerformance
        }
      }
    });
  } catch (error) {
    console.error('Company analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Company info endpoint
router.get('/info', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const company = await Company.findByPk(tenantId, {
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch company info' });
  }
});

// Usage statistics endpoint
router.get('/usage', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const [
      agentsCount,
      departmentsCount,
      storageUsed,
      aiMessagesCount
    ] = await Promise.all([
      User.count({ where: { tenant_id: tenantId, role: 'agent' } }),
      Department.count({ where: { tenant_id: tenantId } }),
      Company.sum('storage_used', { where: { id: tenantId } }) || 0,
      (async () => {
        const VisitorMessage = require('../../models/VisitorMessage');
        const [chatMessages, visitorMessages] = await Promise.all([
      Message.count({
        include: [{
          model: Chat,
          as: 'chat',
          where: { tenant_id: tenantId },
          required: true
        }],
            where: { sender_type: 'ai' }
          }),
          VisitorMessage.count({
            where: { 
              tenant_id: tenantId,
              sender_type: 'ai'
            }
          })
        ]);
        return chatMessages + visitorMessages;
      })()
    ]);

    // Get company plan limits
    const company = await Company.findByPk(tenantId, {
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!company || !company.plan) {
      return res.status(404).json({ success: false, message: 'Company or plan not found' });
    }

    const plan = company.plan;

    res.json({
      success: true,
      data: {
        agents_used: agentsCount,
        agents_limit: plan.max_agents,
        departments_used: departmentsCount,
        departments_limit: plan.max_departments,
        storage_used: storageUsed,
        storage_limit: plan.max_storage,
        ai_messages_used: aiMessagesCount,
        ai_messages_limit: plan.max_ai_messages
      }
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage statistics' });
  }
});

// AI Training endpoints

// Get AI training documents
router.get('/ai-training', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const documents = await AITrainingDoc.findAll({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get AI training docs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI training documents' });
  }
});

// Create AI training document
router.post('/ai-training', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { title, content, category, brand_id } = req.body;

    const document = await AITrainingDoc.create({
      title,
      content,
      category: category || 'general',
      brand_id: brand_id || null, // Allow brand-specific or general training
      tenant_id: tenantId,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'AI training document created successfully',
      data: document
    });
  } catch (error) {
    console.error('Create AI training doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to create AI training document' });
  }
});

// Process AI training document
router.post('/ai-training/:id/process', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'AI training document not found' });
    }

    if (document.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Document is already ${document.status}` 
      });
    }

    // Update status to processing
    await document.update({ status: 'processing' });

    // Simulate processing time (in real implementation, this would be actual AI processing)
    setTimeout(async () => {
      try {
        // In a real implementation, you would:
        // 1. Validate the content
        // 2. Process it with AI/ML services
        // 3. Update the knowledge base
        // 4. Set status to completed or failed
        
        // For now, we'll just mark it as completed
        await document.update({ 
          status: 'completed',
          metadata: {
            processed_at: new Date().toISOString(),
            processed_by: 'system',
            content_length: document.content.length,
            category: document.category
          }
        });
        
        console.log(`AI training document ${id} processed successfully`);
      } catch (error) {
        console.error(`Error processing document ${id}:`, error);
        await document.update({ 
          status: 'failed',
          metadata: {
            error: error.message,
            failed_at: new Date().toISOString()
          }
        });
      }
    }, 2000); // 2 second delay to simulate processing

    res.json({
      success: true,
      message: 'AI training document processing started',
      data: { id: document.id, status: 'processing' }
    });
  } catch (error) {
    console.error('Process AI training doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to process AI training document' });
  }
});

// Process all pending AI training documents
router.post('/ai-training/process-all', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const pendingDocuments = await AITrainingDoc.findAll({
      where: { 
        tenant_id: tenantId,
        status: 'pending'
      }
    });

    if (pendingDocuments.length === 0) {
      return res.json({
        success: true,
        message: 'No pending documents to process',
        data: { processed_count: 0 }
      });
    }

    // Process each document
    const processPromises = pendingDocuments.map(async (document) => {
      await document.update({ status: 'processing' });
      
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await document.update({ 
              status: 'completed',
              metadata: {
                processed_at: new Date().toISOString(),
                processed_by: 'system',
                content_length: document.content.length,
                category: document.category
              }
            });
            resolve({ id: document.id, status: 'completed' });
          } catch (error) {
            await document.update({ 
              status: 'failed',
              metadata: {
                error: error.message,
                failed_at: new Date().toISOString()
              }
            });
            resolve({ id: document.id, status: 'failed' });
          }
        }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
      });
    });

    const results = await Promise.all(processPromises);

    res.json({
      success: true,
      message: `Processing started for ${pendingDocuments.length} documents`,
      data: { 
        processed_count: pendingDocuments.length,
        results 
      }
    });
  } catch (error) {
    console.error('Process all AI training docs error:', error);
    res.status(500).json({ success: false, message: 'Failed to process AI training documents' });
  }
});

// Update AI training document
router.put('/ai-training/:id', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { title, content, category, brand_id } = req.body;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'AI training document not found' });
    }

    await document.update({
      title,
      content,
      category: category || 'general',
      brand_id: brand_id || null, // Allow brand-specific or general training
      status: 'pending' // Reset status when updated
    });

    res.json({
      success: true,
      message: 'AI training document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Update AI training doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to update AI training document' });
  }
});

// Delete AI training document
router.delete('/ai-training/:id', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const document = await AITrainingDoc.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'AI training document not found' });
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'AI training document deleted successfully'
    });
  } catch (error) {
    console.error('Delete AI training doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete AI training document' });
  }
});

// Get AI training statistics
router.get('/ai-training/stats', authenticateToken, requireCompanyAdmin, requireTenant, requireFeatureAccess('ai_training'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const [
      totalDocuments,
      processedDocuments,
      pendingDocuments,
      failedDocuments
    ] = await Promise.all([
      AITrainingDoc.count({ where: { tenant_id: tenantId } }),
      AITrainingDoc.count({ where: { tenant_id: tenantId, status: 'completed' } }),
      AITrainingDoc.count({ where: { tenant_id: tenantId, status: 'pending' } }),
      AITrainingDoc.count({ where: { tenant_id: tenantId, status: 'failed' } })
    ]);

    const trainingProgress = totalDocuments > 0 ? Math.round((processedDocuments / totalDocuments) * 100) : 0;

    res.json({
      success: true,
      data: {
        total_documents: totalDocuments,
        processed_documents: processedDocuments,
        pending_documents: pendingDocuments,
        failed_documents: failedDocuments,
        training_progress: trainingProgress
      }
    });
  } catch (error) {
    console.error('Get AI training stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI training statistics' });
  }
});

// Get available plans for company admin
router.get('/plans', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { is_active: true },
      order: [['price', 'ASC']],
      attributes: [
        'id', 'name', 'description', 'max_agents', 'max_ai_messages', 
        'max_departments', 'allows_calls', 'price', 'billing_cycle', 
        'features', 'max_storage', 'ai_enabled', 'analytics_enabled'
      ]
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
});

// Update company plan
router.put('/plan', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const tenantId = req.user.tenant_id;

    // Validate plan exists
    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Plan not found' 
      });
    }

    // Check if plan is active
    if (!plan.is_active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plan is not active' 
      });
    }

    // Update company plan
    const company = await Company.findByPk(tenantId);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found' 
      });
    }

    await company.update({ 
      plan_id: plan_id,
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        plan_id: plan_id,
        plan_name: plan.name
      }
    });

  } catch (error) {
    console.error('Update company plan error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update company plan' 
    });
  }
});

// Get all chats for monitoring
router.get('/chats', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { agentId, status, limit = 500 } = req.query;

    const whereClause = { tenant_id: tenantId };
    
    if (agentId) {
      whereClause.agent_id = agentId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const chats = await Chat.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    // Get message count for each chat
    const chatsWithCounts = await Promise.all(
      chats.map(async (chat) => {
        const messageCount = await Message.count({ where: { chat_id: chat.id } });
        return {
          ...chat.toJSON(),
          messageCount
        };
      })
    );

    res.json({
      success: true,
      data: chatsWithCounts,
      total: chatsWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats'
    });
  }
});

// Get chat details with messages
router.get('/chats/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const chat = await Chat.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const messages = await Message.findAll({
      where: { chat_id: id },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        ...chat.toJSON(),
        messages: messages.map(msg => msg.toJSON())
      }
    });
  } catch (error) {
    console.error('Error fetching chat details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat details'
    });
  }
});

module.exports = router;