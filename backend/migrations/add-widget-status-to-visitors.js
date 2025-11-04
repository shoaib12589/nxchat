const { sequelize } = require('../config/database');

async function addWidgetStatusToVisitors() {
  try {
    console.log('🚀 Starting widget_status migration...');

    try {
      await sequelize.query(`
        ALTER TABLE visitors 
        ADD COLUMN widget_status ENUM('minimized', 'maximized') NULL 
        COMMENT "Current widget status (minimized or maximized)"
      `);
      console.log('✅ Added column widget_status to visitors table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column widget_status already exists in visitors table');
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
addWidgetStatusToVisitors();

