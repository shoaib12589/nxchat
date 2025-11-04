const { sequelize } = require('../config/database');

async function addAiWelcomeMessageToWidgetSettings() {
  try {
    console.log('🚀 Starting add-ai-welcome-message-to-widget-settings migration...');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'widget_settings'
      AND COLUMN_NAME = 'ai_welcome_message'
    `);

    if (results.length > 0) {
      console.log('⚠️  Column ai_welcome_message already exists in widget_settings table');
    } else {
      // Add ai_welcome_message column
      await sequelize.query(`
        ALTER TABLE widget_settings 
        ADD COLUMN \`ai_welcome_message\` TEXT DEFAULT NULL AFTER \`auto_transfer_keywords\`
      `);
      console.log('✅ Added column ai_welcome_message to widget_settings table');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addAiWelcomeMessageToWidgetSettings();

