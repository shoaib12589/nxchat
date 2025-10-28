const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AgentSetting = sequelize.define('AgentSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agent_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notification_sound_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notification_sound: {
    type: DataTypes.STRING(100),
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
  notification_preferences: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      new_chat: true,
      new_message: true,
      chat_transfer: true,
      ai_alert: true,
      ticket_assigned: true,
      system_announcement: false
    }
  },
  theme: {
    type: DataTypes.ENUM('light', 'dark'),
    allowNull: false,
    defaultValue: 'light'
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  },
  auto_accept_chats: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  max_concurrent_chats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  ai_suggestions_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  grammar_check_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  enable_two_factor: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  two_factor_method: {
    type: DataTypes.ENUM('email', 'google_authenticator'),
    allowNull: true
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
  tableName: 'agent_settings'
});

module.exports = AgentSetting;
