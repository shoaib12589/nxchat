const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  max_agents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  max_ai_messages: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000
  },
  max_departments: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  allows_calls: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  stripe_price_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  billing_cycle: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  max_storage: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 1073741824 // 1GB in bytes
  },
  ai_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  analytics_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  billing_interval: {
    type: DataTypes.ENUM('month', 'year'),
    allowNull: false,
    defaultValue: 'month'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Plan;
