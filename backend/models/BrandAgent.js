const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrandAgent = sequelize.define('BrandAgent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'brands',
      key: 'id'
    }
  },
  agent_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'brand_agents',
  timestamps: false,
  indexes: [
    {
      fields: ['brand_id']
    },
    {
      fields: ['agent_id']
    },
    {
      fields: ['brand_id', 'agent_id'],
      unique: true
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = BrandAgent;
