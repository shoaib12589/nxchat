const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallSession = sequelize.define('CallSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chat_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Chats',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('audio', 'video'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'connected', 'ended', 'failed'),
    allowNull: false,
    defaultValue: 'initiated'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  initiator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  participant_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  quality_metrics: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'call_sessions'
});

module.exports = CallSession;
