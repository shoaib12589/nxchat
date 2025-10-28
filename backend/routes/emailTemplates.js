const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { EmailTemplate } = require('../models');
const { Op } = require('sequelize');

// Get all email templates
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } }
      ];
    }
    if (is_active !== undefined && is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }

    const { count, rows: templates } = await EmailTemplate.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: templates,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email templates' });
  }
});

// Get a single email template
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email template' });
  }
});

// Create a new email template
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, type, subject, html_content, text_content, variables, description, is_active } = req.body;

    if (!name || !type || !subject || !html_content) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, subject, and HTML content are required'
      });
    }

    const template = await EmailTemplate.create({
      name,
      type,
      subject,
      html_content,
      text_content,
      variables: variables || [],
      description,
      is_active: is_active !== undefined ? is_active : true,
      created_by: req.user.id,
      updated_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to create email template' });
  }
});

// Update an email template
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, subject, html_content, text_content, variables, description, is_active } = req.body;

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    await template.update({
      name,
      type,
      subject,
      html_content,
      text_content,
      variables: variables || template.variables,
      description,
      is_active: is_active !== undefined ? is_active : template.is_active,
      updated_by: req.user.id
    });

    res.json({
      success: true,
      message: 'Email template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to update email template' });
  }
});

// Delete an email template
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    await template.destroy();

    res.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete email template' });
  }
});

// Toggle template active status
router.patch('/:id/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    await template.update({
      is_active: !template.is_active,
      updated_by: req.user.id
    });

    res.json({
      success: true,
      message: `Email template ${template.is_active ? 'activated' : 'deactivated'} successfully`,
      data: template
    });
  } catch (error) {
    console.error('Toggle email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle email template status' });
  }
});

// Duplicate an email template
router.post('/:id/duplicate', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    const newTemplate = await EmailTemplate.create({
      name: name || `${template.name} (Copy)`,
      type: template.type,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content,
      variables: template.variables,
      description: template.description,
      is_active: false,
      created_by: req.user.id,
      updated_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Email template duplicated successfully',
      data: newTemplate
    });
  } catch (error) {
    console.error('Duplicate email template error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate email template' });
  }
});

// Test email template
router.post('/:id/test', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { test_email, variables = {} } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Email template not found' });
    }

    // Replace template variables with test values
    let subject = template.subject;
    let html_content = template.html_content;

    // Replace common variables
    const testVariables = {
      name: variables.name || 'Test User',
      email: variables.email || test_email,
      company: variables.company || 'Test Company',
      ...variables
    };

    // Replace variables in subject and content
    Object.keys(testVariables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, testVariables[key]);
      html_content = html_content.replace(regex, testVariables[key]);
    });

    const emailService = require('../services/emailService');

    // Get SMTP settings and send test email
    const smtpSettings = await emailService.getSMTPSettings();
    
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter(smtpSettings);

    await transporter.sendMail({
      from: smtpSettings.auth.user,
      to: test_email,
      subject: subject,
      html: html_content
    });

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Test email template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
});

// Get template variables
router.get('/types/:type/variables', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.params;

    const variableMap = {
      verification: ['name', 'email', 'verification_link', 'expires_at'],
      password_reset: ['name', 'email', 'reset_link', 'expires_at'],
      welcome: ['name', 'email', 'login_link', 'role'],
      agent_invitation: ['name', 'email', 'company', 'login_credentials', 'verification_link'],
      notification: ['name', 'message', 'action_url', 'timestamp'],
      chat_assignment: ['agent_name', 'customer_name', 'chat_url'],
      custom: []
    };

    res.json({
      success: true,
      data: variableMap[type] || []
    });
  } catch (error) {
    console.error('Get template variables error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template variables' });
  }
});

module.exports = router;


