const { sequelize } = require('../config/database');

async function add2FASettingsToTables() {
  try {
    console.log('🚀 Starting 2FA settings migration...');

    // Check and add columns to agent_settings table
    const agentSettingsColumns = [
      { name: 'enable_two_factor', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { name: 'two_factor_method', type: "ENUM('email', 'google_authenticator')" },
      { name: 'session_timeout', type: 'INT DEFAULT 60' },
      { name: 'max_login_attempts', type: 'INT DEFAULT 5' }
    ];

    for (const column of agentSettingsColumns) {
      try {
        await sequelize.query(`
          ALTER TABLE agent_settings 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added column ${column.name} to agent_settings table`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column ${column.name} already exists in agent_settings table`);
        } else {
          throw err;
        }
      }
    }

    // Check and add columns to widget_settings table
    const widgetSettingsColumns = [
      { name: 'enable_two_factor', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { name: 'two_factor_method_email', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
      { name: 'two_factor_method_google_authenticator', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
      { name: 'session_timeout', type: 'INT DEFAULT 60' },
      { name: 'max_login_attempts', type: 'INT DEFAULT 5' }
    ];

    for (const column of widgetSettingsColumns) {
      try {
        await sequelize.query(`
          ALTER TABLE widget_settings 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added column ${column.name} to widget_settings table`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column ${column.name} already exists in widget_settings table`);
        } else {
          throw err;
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
add2FASettingsToTables();

