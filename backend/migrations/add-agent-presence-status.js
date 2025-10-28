const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

async function addAgentPresenceStatus() {
  try {
    console.log('Adding agent_presence_status field to users table...');
    
    // Add the new column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN agent_presence_status ENUM('online', 'away', 'invisible') 
      DEFAULT 'online' 
      AFTER status
    `);
    
    console.log('✅ Successfully added agent_presence_status field');
    
    // Update existing agents to have 'online' status
    await sequelize.query(`
      UPDATE users 
      SET agent_presence_status = 'online' 
      WHERE role = 'agent' AND agent_presence_status IS NULL
    `);
    
    console.log('✅ Updated existing agents to online status');
    
  } catch (error) {
    console.error('❌ Error adding agent presence status:', error);
    throw error;
  }
}

// Run the migration
addAgentPresenceStatus()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
