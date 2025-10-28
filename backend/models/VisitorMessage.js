const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VisitorMessage = sequelize.define('VisitorMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  visitor_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: 'visitors',
      key: 'id'
    }
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  sender_type: {
    type: DataTypes.ENUM('visitor', 'agent', 'ai', 'system'),
    allowNull: false,
    defaultValue: 'visitor'
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Agent ID when sender_type is agent'
  },
  sender_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Name of the sender (visitor name, agent name, etc.)'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'system', 'ai_suggestion'),
    allowNull: false,
    defaultValue: 'text'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'visitor_messages',
  timestamps: true,
  indexes: [
    {
      fields: ['visitor_id']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['sender_type']
    }
  ]
});

module.exports = VisitorMessage;
