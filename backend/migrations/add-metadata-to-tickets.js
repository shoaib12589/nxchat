const { sequelize } = require('../config/database');

async function addMetadataToTickets() {
  try {
    console.log('🔧 Adding metadata column to tickets table...');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM \`tickets\` LIKE 'metadata';
    `);

    if (columns && columns.length > 0) {
      console.log('✅ metadata column already exists in tickets table');
      await sequelize.close();
      return;
    }

    // Add metadata column (JSON can't have default in MySQL, but Sequelize will handle it)
    await sequelize.query(`
      ALTER TABLE \`tickets\` 
      ADD COLUMN \`metadata\` JSON NULL;
    `);

    console.log('✅ Added metadata column to tickets table');
  } catch (error) {
    console.error('❌ Failed to add metadata column:', error.message || error);
  } finally {
    await sequelize.close();
  }
}

// Run directly
addMetadataToTickets();

