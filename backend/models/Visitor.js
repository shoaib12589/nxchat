const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Visitor = sequelize.define('Visitor', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('online', 'away', 'offline', 'idle', 'waiting_for_agent'),
    defaultValue: 'idle'
  },
  current_page: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  referrer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  device: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  session_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Session duration in seconds'
  },
  messages_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  visits_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of visits by this visitor'
  },
  is_typing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  assigned_agent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of tags for categorization'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Traffic source (Google, Bing, Direct, etc.)'
  },
  medium: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Traffic medium (organic, social, referral, etc.)'
  },
  campaign: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Campaign name from UTM'
  },
  content: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Content identifier from UTM'
  },
  term: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Term/keyword from UTM'
  },
  keyword: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Search keyword used by visitor'
  },
  search_engine: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Search engine name (Google, Bing, etc.)'
  },
  landing_page: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'First page visited in session'
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brands',
      key: 'id'
    }
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_widget_update: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time visitor interacted with chat widget (opened/minimized)'
  },
  widget_status: {
    type: DataTypes.ENUM('minimized', 'maximized'),
    allowNull: true,
    comment: 'Current widget status (minimized or maximized)'
  }
}, {
  tableName: 'visitors',
  timestamps: true,
  indexes: [
    {
      fields: ['session_id']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['assigned_agent_id']
    },
    {
      fields: ['last_activity']
    }
  ]
});

module.exports = Visitor;
