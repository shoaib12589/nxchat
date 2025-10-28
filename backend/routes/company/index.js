const express = require('express');
const router = express.Router();
const { authenticateToken, requireCompanyAdmin } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantAuth');
const { Department, User, Chat, Message, Trigger, WidgetSetting, Ticket, Company, Plan, AITrainingDoc, Brand } = require('../../models');

// Dashboard
router.get('/dashboard', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const [
      totalAgents,
      activeChats,
      totalTickets,
      totalMessages,
      recentChats,
      recentTickets
    ] = await Promise.all([
      User.count({ where: { tenant_id: tenantId, role: 'agent' } }),
      Chat.count({ where: { tenant_id: tenantId, status: 'active' } }),
      Ticket.count({ where: { tenant_id: tenantId } }),
      Message.count({
        include: [{ model: Chat, as: 'chat', where: { tenant_id: tenantId } }]
      }),
      Chat.findAll({
        where: { tenant_id: tenantId },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'agent' }
        ]
      }),
      Ticket.findAll({
        where: { tenant_id: tenantId },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'agent' }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        totalAgents,
        activeChats,
        totalTickets,
        totalMessages,
        recentChats,
        recentTickets
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
    const departments = await Department.findAll({
      where: { tenant_id: tenantId },
      include: [
        { model: User, as: 'users', where: { role: 'agent' }, required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

router.post('/departments', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
    res.status(500).json({ success: false, message: 'Failed to create department' });
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
        { model: Department, as: 'department' },
        { model: require('../../models').AgentSetting, as: 'agentSettings' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
});

router.post('/agents', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { creation_method, password, send_invite, first_name, last_name, ...otherData } = req.body;
    
    // Combine first_name and last_name into name field
    const name = `${first_name} ${last_name}`.trim();
    
    let agentData = { 
      ...otherData,
      name,
      tenant_id: tenantId,
      role: 'agent',
      email_verified: true
    };

    // Handle password or invite creation
    if (creation_method === 'password') {
      // Password will be hashed by User model's beforeCreate hook
      if (password) {
        agentData.password = password;
      }
    } else if (creation_method === 'invite') {
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
      const { AgentSetting } = require('../../models');
      await AgentSetting.create({
        agent_id: agent.id,
        notification_sound: 'default',
        notification_volume: 0.5,
        notification_preferences: JSON.stringify({
          new_chat: true,
          new_message: true,
          chat_transfer: true,
          ai_alert: true,
          ticket_assigned: true,
          system_announcement: false
        })
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
    res.status(500).json({ success: false, message: 'Failed to create agent' });
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

    if (!widgetSettings) {
      // Create default widget settings
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
    res.status(500).json({ success: false, message: 'Failed to fetch widget settings' });
  }
});

router.put('/widget', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    const [widgetSettings] = await WidgetSetting.upsert({
      tenant_id: tenantId,
      ...req.body
    });

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
      averageResponseTime,
      customerSatisfaction,
      activeAgents
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
      // Placeholder calculations
      120,
      4.2,
      User.count({ where: { tenant_id: tenantId, role: 'agent', status: 'active' } })
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalChats,
        totalMessages,
        averageResponseTime,
        customerSatisfaction,
        activeAgents
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
      Message.count({
        include: [{
          model: Chat,
          as: 'chat',
          where: { tenant_id: tenantId },
          required: true
        }],
        where: { message_type: 'ai_response' }
      })
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
router.get('/ai-training', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.post('/ai-training', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.post('/ai-training/:id/process', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.post('/ai-training/process-all', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.put('/ai-training/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.delete('/ai-training/:id', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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
router.get('/ai-training/stats', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
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