const { sequelize } = require('../config/database');

async function addNotificationSoundSettings() {
  try {
    console.log('Adding notification sound settings to widget_settings table...');
    
    // Add notification sound columns to widget_settings table
    await sequelize.query(`
      ALTER TABLE widget_settings 
      ADD COLUMN notification_sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN notification_sound_file VARCHAR(50) NOT NULL DEFAULT 'default',
      ADD COLUMN notification_volume DECIMAL(3, 2) NOT NULL DEFAULT 0.5 CHECK (notification_volume >= 0 AND notification_volume <= 1)
    `);
    
    console.log('✅ Notification sound settings added successfully');
    
    // Update existing records to have default values
    await sequelize.query(`
      UPDATE widget_settings 
      SET 
        notification_sound_enabled = TRUE,
        notification_sound_file = 'default',
        notification_volume = 0.5
      WHERE notification_sound_enabled IS NULL
    `);
    
    console.log('✅ Existing widget settings updated with default notification sound values');
    
  } catch (error) {
    console.error('❌ Error adding notification sound settings:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addNotificationSoundSettings();
