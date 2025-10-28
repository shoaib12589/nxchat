const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticateToken, requireSuperAdmin } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantAuth');
const { Company, User, Plan, Chat, Message, CallSession, Ticket, Visitor } = require('../../models');

// Dashboard analytics
router.get('/dashboard', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalCompanies,
      totalUsers,
      activeChats,
      totalMessages,
      totalRevenue,
      recentCompanies
    ] = await Promise.all([
      Company.count(),
      User.count({ where: { role: { [Op.ne]: 'super_admin' } } }),
      Chat.count({ where: { status: 'active' } }),
      Message.count(),
      Company.sum('storage_used') || 0, // Placeholder for revenue calculation
      Company.findAll({
        limit: 5,
        order: [['created_at', 'DESC']]
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        activeChats,
        totalMessages,
        totalRevenue,
        recentCompanies
      }
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// Companies management
router.get('/companies', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const { count, rows: companies } = await Company.findAndCountAll({
      where: whereClause,
      include: [
        { model: Plan, as: 'plan' },
        { model: User, as: 'users', where: { role: 'company_admin' }, required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: companies,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch companies' });
  }
});

router.post('/companies', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, plan_id, status = 'pending', admin_name, admin_email, admin_password } = req.body;

    // Validate required admin fields
    if (!admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        success: false,
        message: 'Admin name, email, and password are required'
      });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ where: { email: admin_email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Admin email already exists'
      });
    }

    // Create company first
    const company = await Company.create({
      name,
      plan_id,
      status
    });

    // Create company admin user
    const adminUser = await User.create({
      name: admin_name,
      email: admin_email,
      password: admin_password,
      role: 'company_admin',
      tenant_id: company.id,
      status: 'active',
      email_verified: true // Auto-verify admin users created by super admin
    });

    res.status(201).json({
      success: true,
      message: 'Company and admin user created successfully',
      data: {
        company: company.toJSON(),
        admin: adminUser.toJSON()
      }
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ success: false, message: 'Failed to create company' });
  }
});

router.put('/companies/:id/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.update({ status });
    
    res.json({
      success: true,
      message: `Company status updated to ${status}`,
      company: company.toJSON()
    });
  } catch (error) {
    console.error('Update company status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update company status' });
  }
});

router.put('/companies/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plan_id, status, admin_name, admin_email, admin_password } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Update company
    await company.update({
      name,
      plan_id,
      status
    });

    // Find existing admin user
    const existingAdmin = await User.findOne({
      where: {
        tenant_id: company.id,
        role: 'company_admin'
      }
    });

    let adminUser = existingAdmin;

    // If admin fields are provided, update or create admin user
    if (admin_name || admin_email || admin_password) {
      if (existingAdmin) {
        // Update existing admin
        const updateData = {};
        if (admin_name) updateData.name = admin_name;
        if (admin_email) updateData.email = admin_email;
        if (admin_password) updateData.password = admin_password;

        await existingAdmin.update(updateData);
        adminUser = existingAdmin;
      } else {
        // Create new admin if none exists
        if (!admin_name || !admin_email || !admin_password) {
          return res.status(400).json({
            success: false,
            message: 'Admin name, email, and password are required to create new admin'
          });
        }

        // Check if email already exists
        const emailExists = await User.findOne({ where: { email: admin_email } });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Admin email already exists'
          });
        }

        adminUser = await User.create({
          name: admin_name,
          email: admin_email,
          password: admin_password,
          role: 'company_admin',
          tenant_id: company.id,
          status: 'active',
          email_verified: true
        });
      }
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: {
        company: company.toJSON(),
        admin: adminUser ? adminUser.toJSON() : null
      }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ success: false, message: 'Failed to update company' });
  }
});

router.delete('/companies/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.destroy();
    
    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete company' });
  }
});

// Plans management
router.get('/plans', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const plans = await Plan.findAll({
      order: [['price', 'ASC']]
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

router.post('/plans', authenticateToken, requireSuperAdmin, async (req, res) => {
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
    res.status(500).json({ success: false, message: 'Failed to create plan' });
  }
});

router.put('/plans/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const planData = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await plan.update(planData);
    
    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
});

router.delete('/plans/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await plan.destroy();
    
    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
});

// System settings
router.get('/settings', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { SystemSetting } = require('../../models');
    const settings = await SystemSetting.findAll();
    
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.value;
    });

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.put('/settings', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { SystemSetting } = require('../../models');
    const settings = req.body;

    // Define setting categories and their descriptions
    const settingCategories = {
      // General Settings
      site_name: { category: 'general', description: 'The name of the application' },
      site_description: { category: 'general', description: 'Description of the application' },
      site_url: { category: 'general', description: 'The base URL of the application' },
      support_email: { category: 'general', description: 'Support email address' },
      admin_email: { category: 'general', description: 'Admin email address' },
      
      // Security Settings
      enable_registration: { category: 'security', description: 'Whether new user registration is enabled' },
      require_email_verification: { category: 'security', description: 'Whether email verification is required for new users' },
      enable_two_factor: { category: 'security', description: 'Whether two-factor authentication is enabled' },
      two_factor_method_email: { category: 'security', description: 'Enable email-based 2FA' },
      two_factor_method_google_authenticator: { category: 'security', description: 'Enable Google Authenticator-based 2FA' },
      session_timeout: { category: 'security', description: 'Session timeout in minutes' },
      max_login_attempts: { category: 'security', description: 'Maximum login attempts before lockout' },
      
      // Email Settings
      smtp_host: { category: 'email', description: 'SMTP server host' },
      smtp_port: { category: 'email', description: 'SMTP server port' },
      smtp_user: { category: 'email', description: 'SMTP username' },
      smtp_password: { category: 'email', description: 'SMTP password', is_encrypted: true },
      smtp_secure: { category: 'email', description: 'Use secure SMTP connection' },
      
      // System Settings
      maintenance_mode: { category: 'system', description: 'Whether maintenance mode is enabled' },
      debug_mode: { category: 'system', description: 'Whether debug mode is enabled' },
      log_level: { category: 'system', description: 'Logging level' },
      max_file_size: { category: 'system', description: 'Maximum file upload size in MB' },
      allowed_file_types: { category: 'system', description: 'Comma-separated list of allowed file types' },
      
      // Storage Settings
      storage_provider: { category: 'storage', description: 'Default storage provider' },
      storage_bucket: { category: 'storage', description: 'Default storage bucket' },
      storage_region: { category: 'storage', description: 'Default storage region' },
      
      // AI Settings
      openai_api_key: { category: 'ai', description: 'OpenAI API key', is_encrypted: true },
      ai_model: { category: 'ai', description: 'Default AI model to use' },
      ai_temperature: { category: 'ai', description: 'AI response temperature' },
      ai_max_tokens: { category: 'ai', description: 'Maximum tokens for AI responses' },
      ai_agent_name: { category: 'ai', description: 'Name displayed for the AI agent in conversations' },
      ai_agent_logo: { category: 'ai', description: 'URL of the logo image for the AI agent' },
      ai_system_message: { category: 'ai', description: 'System message that defines AI behavior and personality' },
      
      // Payment Settings
      stripe_secret_key: { category: 'payment', description: 'Stripe secret key', is_encrypted: true },
      stripe_publishable_key: { category: 'payment', description: 'Stripe publishable key' },
      stripe_webhook_secret: { category: 'payment', description: 'Stripe webhook secret', is_encrypted: true },
      
      // Feature Flags
      enable_ai_chatbot: { category: 'features', description: 'Enable AI chatbot feature' },
      enable_video_calls: { category: 'features', description: 'Enable video calling feature' },
      enable_file_sharing: { category: 'features', description: 'Enable file sharing feature' },
      enable_analytics: { category: 'features', description: 'Enable analytics feature' },
      enable_webhooks: { category: 'features', description: 'Enable webhooks feature' }
    };

    for (const [key, value] of Object.entries(settings)) {
      const settingConfig = settingCategories[key] || { 
        category: 'general', 
        description: `Setting for ${key}`,
        is_encrypted: false 
      };

      await SystemSetting.upsert({
        setting_key: key,
        value: String(value),
        description: settingConfig.description,
        category: settingConfig.category,
        is_encrypted: settingConfig.is_encrypted || false,
        updated_by: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Test email endpoint
router.post('/test-email', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const emailService = require('../../services/emailService');
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // Test email configuration with actual sending
    const result = await emailService.testEmailConfiguration(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${email}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
});

// Get settings by category
router.get('/settings/:category', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const { SystemSetting } = require('../../models');
    
    const settings = await SystemSetting.findAll({
      where: { category },
      order: [['setting_key', 'ASC']]
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Reset settings to default
router.post('/settings/reset', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { SystemSetting } = require('../../models');
    
    // Delete all custom settings
    await SystemSetting.destroy({
      where: {
        category: {
          [Op.ne]: 'default'
        }
      }
    });

    // Recreate default settings
    const defaultSettings = [
      { setting_key: 'site_name', value: 'NxChat', category: 'general', description: 'The name of the application' },
      { setting_key: 'site_url', value: 'http://localhost:3000', category: 'general', description: 'The base URL of the application' },
      { setting_key: 'support_email', value: 'support@nxchat.com', category: 'general', description: 'Support email address' },
      { setting_key: 'enable_registration', value: 'true', category: 'security', description: 'Whether new user registration is enabled' },
      { setting_key: 'require_email_verification', value: 'false', category: 'security', description: 'Whether email verification is required for new users' },
      { setting_key: 'session_timeout', value: '3600', category: 'security', description: 'Session timeout in seconds' },
      { setting_key: 'max_file_size', value: '10485760', category: 'system', description: 'Maximum file upload size in bytes' },
      { setting_key: 'allowed_file_types', value: 'jpg,jpeg,png,gif,pdf,doc,docx,txt', category: 'system', description: 'Comma-separated list of allowed file types' }
    ];

    for (const setting of defaultSettings) {
      await SystemSetting.upsert({
        ...setting,
        updated_by: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'Settings reset to default values'
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset settings' });
  }
});

// System health check
router.get('/health', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { sequelize } = require('../../config/database');
    const { SystemSetting } = require('../../models');
    
    // Test database connection
    await sequelize.authenticate();
    
    // Get system status
    const maintenanceMode = await SystemSetting.findOne({
      where: { setting_key: 'maintenance_mode' }
    });

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        maintenance_mode: maintenanceMode?.value === 'true',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false, 
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message
      }
    });
  }
});

// Analytics
router.get('/analytics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
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
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      newCompanies,
      newUsers,
      totalChats,
      totalMessages,
      averageResponseTime,
      customerSatisfaction
    ] = await Promise.all([
      Company.count({ where: { created_at: { [Op.gte]: startDate } } }),
      User.count({
        where: {
          created_at: { [Op.gte]: startDate },
          role: { [Op.ne]: 'super_admin' }
        }
      }),
      Chat.count({ where: { created_at: { [Op.gte]: startDate } } }),
      Message.count({ where: { created_at: { [Op.gte]: startDate } } }),
      // Placeholder calculations - would need more complex queries for real metrics
      120, // Average response time in seconds
      4.2  // Customer satisfaction score
    ]);

    res.json({
      success: true,
      data: {
        period,
        newCompanies,
        newUsers,
        totalChats,
        totalMessages,
        averageResponseTime,
        customerSatisfaction,
        revenue: 0 // Would calculate from Stripe data
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get all visitors across all companies
router.get('/visitors', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status, device, search, page = 1, limit = 50, companyId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { 
      is_active: true 
    };

    if (companyId) {
      whereClause.tenant_id = companyId;
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
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: true
        },
        {
          model: User,
          as: 'assignedAgent',
          attributes: ['id', 'name', 'avatar'],
          required: false
        },
        {
          model: require('../../models').Brand,
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
        visitor.location?.city?.toLowerCase().includes(searchTerm) ||
        visitor.company?.name?.toLowerCase().includes(searchTerm) ||
        visitor.brand?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Transform visitors to include brandName for easier frontend access
    const transformedVisitors = filteredVisitors.map(visitor => ({
      ...visitor.toJSON(),
      brandName: visitor.brand?.name || 'No Brand'
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

// Widget keys management
router.get('/widget-keys', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { WidgetKey } = require('../../models');
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
    res.status(500).json({ success: false, message: 'Failed to fetch widget keys' });
  }
});

router.post('/companies/:companyId/widget-key', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { WidgetKey } = require('../../models');
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
});

module.exports = router;