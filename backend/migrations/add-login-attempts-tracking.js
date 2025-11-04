const { sequelize } = require('../config/database');

async function addLoginAttemptsTracking() {
  try {
    console.log('Adding failed_login_attempts and account_locked_until fields to users table...');
    
    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('failed_login_attempts', 'account_locked_until')
    `);
    
    const existingColumns = results.map(r => r.COLUMN_NAME);
    
    // Add failed_login_attempts column if it doesn't exist
    if (!existingColumns.includes('failed_login_attempts')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0 
        AFTER last_login
      `);
      console.log('✅ Successfully added failed_login_attempts field');
    } else {
      console.log('⚠️  failed_login_attempts field already exists');
    }
    
    // Add account_locked_until column if it doesn't exist
    if (!existingColumns.includes('account_locked_until')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN account_locked_until DATETIME NULL 
        AFTER failed_login_attempts
      `);
      console.log('✅ Successfully added account_locked_until field');
    } else {
      console.log('⚠️  account_locked_until field already exists');
    }
    
    // Reset all locked accounts that have expired
    await sequelize.query(`
      UPDATE users 
      SET failed_login_attempts = 0, 
          account_locked_until = NULL 
      WHERE account_locked_until IS NOT NULL 
      AND account_locked_until < NOW()
    `);
    
    console.log('✅ Reset expired account locks');
    
  } catch (error) {
    console.error('❌ Error adding login attempts tracking:', error);
    throw error;
  }
}

// Run the migration
addLoginAttemptsTracking()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

