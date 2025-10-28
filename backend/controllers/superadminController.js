const { User, Company, Plan, Department, Chat, Message, Trigger, AITrainingDoc, Notification, CallSession, Ticket, AgentSetting, WidgetSetting, StorageProvider, SystemSetting, WidgetKey } = require('../models');

// Get dashboard data
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [
        { model: Company, as: 'company' }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get basic stats
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { status: 'active' } });
    const totalPlans = await Plan.count();
    const totalUsers = await User.count();

    // Get recent companies
    const recentCompanies = await Company.findAll({
      include: [
        { model: Plan, as: 'plan' }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Get system settings
    const systemSettings = await SystemSetting.findAll();

    res.json({
      success: true,
      data: {
        stats: {
          totalCompanies,
          activeCompanies,
          totalPlans,
          totalUsers
        },
        recentCompanies,
        systemSettings: systemSettings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {})
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

// Get all companies
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        { model: Plan, as: 'plan' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get companies'
    });
  }
};

// Update company status
const updateCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    await company.update({ status });

    res.json({
      success: true,
      message: 'Company status updated successfully',
      data: company
    });
  } catch (error) {
    console.error('Update company status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company status'
    });
  }
};

// Delete company
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    await company.destroy();

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company'
    });
  }
};

// Get all plans
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans'
    });
  }
};

// Create plan
const createPlan = async (req, res) => {
  try {
    const planData = req.body;
    const plan = await Plan.create(planData);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan'
    });
  }
};

// Update plan
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const planData = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    await plan.update(planData);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan'
    });
  }
};

// Delete plan
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan'
    });
  }
};

// Get system settings
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system settings'
    });
  }
};

// Update system settings
const updateSystemSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    for (const setting of settings) {
      await SystemSetting.update(
        { value: setting.value },
        { where: { id: setting.id } }
      );
    }

    res.json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings'
    });
  }
};

// Get analytics
const getAnalytics = async (req, res) => {
  try {
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
    const totalCompanies = await Company.count();
    const newCompanies = await Company.count({
      where: {
        created_at: {
          [require('sequelize').Op.gte]: startDate
        }
      }
    });

    const totalUsers = await User.count();
    const totalChats = await Chat.count();
    const totalMessages = await Message.count();

    res.json({
      success: true,
      data: {
        period,
        stats: {
          totalCompanies,
          newCompanies,
          totalUsers,
          totalChats,
          totalMessages
        },
        charts: {
          companiesOverTime: [], // TODO: Implement time-series data
          usersOverTime: [],
          chatsOverTime: []
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

// Get widget keys for all companies
const getWidgetKeys = async (req, res) => {
  try {
    const widgetKeys = await WidgetKey.findAll({
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: widgetKeys
    });
  } catch (error) {
    console.error('Get widget keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get widget keys'
    });
  }
};

// Generate new widget key for a company
const generateWidgetKey = async (req, res) => {
  try {
    const { companyId } = req.params;
    const crypto = require('crypto');

    // Check if company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Deactivate existing keys for this company
    await WidgetKey.update(
      { is_active: false },
      { where: { tenant_id: companyId } }
    );

    // Generate new widget key
    const widgetKey = await WidgetKey.create({
      tenant_id: companyId,
      key: crypto.randomUUID(),
      is_active: true
    });

    res.json({
      success: true,
      data: {
        widgetKey,
        snippetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/widget/snippet.js?key=${widgetKey.key}`
      }
    });
  } catch (error) {
    console.error('Generate widget key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate widget key'
    });
  }
};

module.exports = {
  getDashboardData,
  getCompanies,
  updateCompanyStatus,
  deleteCompany,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getSystemSettings,
  updateSystemSettings,
  getAnalytics,
  getWidgetKeys,
  generateWidgetKey
};