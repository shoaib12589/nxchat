const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trigger = sequelize.define('Trigger', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  conditions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  actions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  trigger_type: {
    type: DataTypes.ENUM('message', 'time', 'visitor', 'chat_status'),
    allowNull: false,
    defaultValue: 'message'
  }
}, {
  tableName: 'triggers'
});

module.exports = Trigger;
