const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StorageProvider = sequelize.define('StorageProvider', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  provider_name: {
    type: DataTypes.ENUM('r2', 'wasabi', 's3'),
    allowNull: false
  },
  access_key: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  secret_key: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  bucket_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  endpoint: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  region: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'us-east-1'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  max_storage_gb: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  used_storage_bytes: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'storage_providers'
});

module.exports = StorageProvider;
