const { sequelize } = require('../config/database');

async function fixDepartmentsIdAutoIncrement() {
  try {
    console.log('🚀 Starting departments id auto_increment fix...');

    // Check current table structure
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM departments WHERE Field = 'id'
    `);

    if (results.length === 0) {
      console.log('⚠️  Departments table does not exist');
      process.exit(0);
    }

    const idColumn = results[0];
    
    // Check if AUTO_INCREMENT is already set
    if (idColumn.Extra && idColumn.Extra.includes('auto_increment')) {
      console.log('⚠️  id column already has AUTO_INCREMENT');
    } else {
      // Modify the id column to add AUTO_INCREMENT
      await sequelize.query(`
        ALTER TABLE departments 
        MODIFY COLUMN id INT AUTO_INCREMENT
      `);
      console.log('✅ Added AUTO_INCREMENT to departments.id column');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixDepartmentsIdAutoIncrement();

