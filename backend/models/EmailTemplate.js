const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailTemplate = sequelize.define('EmailTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Template name (e.g., "Welcome Email")'
  },
  type: {
    type: DataTypes.ENUM(
      'verification',
      'password_reset',
      'welcome',
      'agent_invitation',
      'notification',
      'chat_assignment',
      'custom'
    ),
    allowNull: false,
    defaultValue: 'custom',
    comment: 'Template type/category'
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Email subject line (supports variables)'
  },
  html_content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'HTML email content with template variables'
  },
  text_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Plain text version of the email'
  },
  variables: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Available template variables (e.g., {name}, {email})'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Template description/notes'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this template is active'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who created this template'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who last updated this template'
  }
}, {
  tableName: 'email_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = EmailTemplate;

