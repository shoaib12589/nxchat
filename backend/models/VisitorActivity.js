const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VisitorActivity = sequelize.define('VisitorActivity', {
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
  session_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  activity_data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  page_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'visitor_activities',
  timestamps: false,
  indexes: [
    {
      fields: ['visitor_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['activity_type']
    },
    {
      fields: ['timestamp']
    }
  ]
});

module.exports = VisitorActivity;
