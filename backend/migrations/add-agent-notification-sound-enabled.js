const { sequelize } = require('../config/database');

async function addAgentNotificationSoundEnabled() {
  try {
    console.log('Adding notification_sound_enabled field to agent_settings table...');
    
    // Add notification_sound_enabled column to agent_settings table
    await sequelize.query(`
      ALTER TABLE agent_settings 
      ADD COLUMN notification_sound_enabled BOOLEAN NOT NULL DEFAULT TRUE
    `);
    
    console.log('✅ notification_sound_enabled field added successfully');
    
    // Update existing records to have default value
    await sequelize.query(`
      UPDATE agent_settings 
      SET notification_sound_enabled = TRUE
      WHERE notification_sound_enabled IS NULL
    `);
    
    console.log('✅ Existing agent settings updated with default notification_sound_enabled value');
    
  } catch (error) {
    console.error('❌ Error adding notification_sound_enabled field:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addAgentNotificationSoundEnabled();
