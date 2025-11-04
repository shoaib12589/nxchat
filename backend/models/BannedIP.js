const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BannedIP = sequelize.define('BannedIP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ip_address: {
    type: DataTypes.STRING(45), // IPv6 can be up to 45 characters
    allowNull: false,
    unique: true
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    },
    comment: 'The tenant/company that banned this IP'
  },
  banned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'The agent/admin who banned this IP'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional reason for the ban'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the ban is currently active'
  }
}, {
  tableName: 'banned_ips',
  timestamps: true,
  indexes: [
    {
      fields: ['ip_address'],
      unique: true
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = BannedIP;

