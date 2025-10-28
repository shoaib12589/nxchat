const { User, Company, Plan, Department, Chat, Message, Trigger, AITrainingDoc, Notification, CallSession, Ticket, AgentSetting, WidgetSetting, WidgetKey } = require('../models');

// Get dashboard data
const getDashboardData = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Get company info
    const company = await Company.findByPk(tenantId, {
      include: [
        { model: Plan, as: 'plan' }
      ]
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get stats
    const totalAgents = await User.count({
      where: { tenant_id: tenantId, role: 'agent' }
    });
    const totalDepartments = await Department.count({
      where: { tenant_id: tenantId }
    });
    const totalChats = await Chat.count({
      where: { tenant_id: tenantId }
    });
    const activeChats = await Chat.count({
      where: { tenant_id: tenantId, status: 'active' }
    });

    // Get recent chats
    const recentChats = await Chat.findAll({
      where: { tenant_id: tenantId },
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'agent' },
        { model: Department, as: 'department' }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        company,
        stats: {
          totalAgents,
          totalDepartments,
          totalChats,
          activeChats
        },
        recentChats
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};

// Get departments
const getDepartments = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const departments = await Department.findAll({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get departments'
    });
  }
};

// Create department
const createDepartment = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const departmentData = { ...req.body, tenant_id: tenantId };
    
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
      message: 'Failed to create department'
    });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const departmentData = req.body;

    const department = await Department.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.update(departmentData);

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department'
    });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const department = await Department.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.destroy();

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department'
    });
  }
};

// Get agents
const getAgents = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const agents = await User.findAll({
      where: { 
        tenant_id: tenantId, 
        role: 'agent' 
      },
      include: [
        { model: Department, as: 'department' }
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
      message: 'Failed to get agents'
    });
  }
};

// Create agent
const createAgent = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const agentData = { 
      ...req.body, 
      tenant_id: tenantId,
      role: 'agent',
      email_verified: true,
      status: 'active'
    };
    
    const agent = await User.create(agentData);

    // Create agent settings
    await AgentSetting.create({
      agent_id: agent.id,
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

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: agent
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent'
    });
  }
};

// Update agent
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const agentData = req.body;

    const agent = await User.findOne({
      where: { 
        id, 
        tenant_id: tenantId,
        role: 'agent'
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    await agent.update(agentData);

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent'
    });
  }
};

// Delete agent
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const agent = await User.findOne({
      where: { 
        id, 
        tenant_id: tenantId,
        role: 'agent'
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    await agent.destroy();

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent'
    });
  }
};

// Get triggers
const getTriggers = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to get triggers'
    });
  }
};

// Create trigger
const createTrigger = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to create trigger'
    });
  }
};

// Update trigger
const updateTrigger = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const triggerData = req.body;

    const trigger = await Trigger.findOne({
      where: { id, tenant_id: tenantId }
    });

    if (!trigger) {
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }

    await trigger.update(triggerData);

    res.json({
      success: true,
      message: 'Trigger updated successfully',
      data: trigger
    });
  } catch (error) {
    console.error('Update trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trigger'
    });
  }
};

// Delete trigger
const deleteTrigger = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Failed to delete trigger'
    });
  }
};

// Get widget settings
const getWidgetSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

      // Create default settings if none exist
      if (!widgetSettings) {
        widgetSettings = await WidgetSetting.create({
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
    res.status(500).json({
      success: false,
      message: 'Failed to get widget settings'
    });
  }
};

// Update widget settings
const updateWidgetSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const settingsData = req.body;

    let widgetSettings = await WidgetSetting.findOne({
      where: { tenant_id: tenantId }
    });

    if (!widgetSettings) {
      widgetSettings = await WidgetSetting.create({
        tenant_id: tenantId,
        ...settingsData
      });
    } else {
      await widgetSettings.update(settingsData);
    }

    res.json({
      success: true,
      message: 'Widget settings updated successfully',
      data: widgetSettings
    });
  } catch (error) {
    console.error('Update widget settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update widget settings'
    });
  }
};

// Get analytics
const getAnalytics = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get analytics data
    const totalChats = await Chat.count({
      where: { tenant_id: tenantId }
    });
    
    const newChats = await Chat.count({
      where: {
        tenant_id: tenantId,
        created_at: {
          [require('sequelize').Op.gte]: startDate
        }
      }
    });

    const totalMessages = await Message.count({
      include: [{
        model: Chat,
        where: { tenant_id: tenantId }
      }]
    });

    const avgResponseTime = 0; // TODO: Calculate actual response time

    res.json({
      success: true,
      data: {
        period,
        stats: {
          totalChats,
          newChats,
          totalMessages,
          avgResponseTime
        },
        charts: {
          chatsOverTime: [], // TODO: Implement time-series data
          messagesOverTime: [],
          responseTimeOverTime: []
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
};

module.exports = {
  getDashboardData,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  getWidgetSettings,
  updateWidgetSettings,
  getAnalytics
};