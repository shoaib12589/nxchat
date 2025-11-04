const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WidgetSetting = sequelize.define('WidgetSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  theme_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#007bff'
  },
  position: {
    type: DataTypes.ENUM('bottom-right', 'bottom-left', 'top-right', 'top-left'),
    allowNull: false,
    defaultValue: 'bottom-right'
  },
  welcome_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Hello! How can we help you today?'
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  enable_audio: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  enable_video: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  enable_file_upload: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  ai_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  ai_personality: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'friendly'
  },
  auto_transfer_keywords: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['speak to human', 'agent', 'representative']
  },
  ai_welcome_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  offline_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'We are currently offline. Please leave a message and we will get back to you soon.'
  },
  custom_css: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  custom_js: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notification_sound_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notification_sound_file: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'default'
  },
  notification_volume: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.5,
    validate: {
      min: 0,
      max: 1
    }
  },
  auto_maximize_on_message: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  enable_two_factor: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  two_factor_method_email: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  two_factor_method_google_authenticator: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  session_timeout: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 60
  },
  max_login_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5
  }
}, {
  tableName: 'widget_settings'
});

module.exports = WidgetSetting;
