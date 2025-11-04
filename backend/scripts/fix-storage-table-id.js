const { sequelize } = require('../config/database');

async function fixId() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Fix the id column to be auto increment
    await sequelize.query(`
      ALTER TABLE storage_providers MODIFY COLUMN id INT AUTO_INCREMENT
    `);

    console.log('✅ Table ID field fixed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixId();

