const { sequelize } = require('../config/database');

async function addVisitsCountToVisitors() {
  try {
    console.log('🚀 Starting visits_count migration...');

    try {
      await sequelize.query(`
        ALTER TABLE visitors 
        ADD COLUMN visits_count INT DEFAULT 1 COMMENT "Number of visits by this visitor"
      `);
      console.log('✅ Added column visits_count to visitors table');

      // Update existing records to have visits_count = 1
      await sequelize.query(`
        UPDATE visitors 
        SET visits_count = 1 
        WHERE visits_count IS NULL OR visits_count = 0
      `);
      console.log('✅ Updated existing visitors with visits_count = 1');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column visits_count already exists in visitors table');
      } else {
        throw err;
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
addVisitsCountToVisitors();

