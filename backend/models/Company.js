const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  stripe_customer_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  stripe_subscription_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  storage_quota: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 1073741824 // 1GB in bytes
  },
  storage_used: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscription_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'companies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Company;
