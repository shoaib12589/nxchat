const { sequelize } = require('../config/database');

async function addMaxBrandsToPlans() {
  try {
    console.log('🚀 Starting max_brands migration...');

    try {
      // Check if column already exists
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'plans' 
        AND COLUMN_NAME = 'max_brands'
      `);

      if (results.length > 0) {
        console.log('⚠️  Column max_brands already exists in plans table');
      } else {
        // Add max_brands column
        await sequelize.query(`
          ALTER TABLE plans 
          ADD COLUMN \`max_brands\` INT NOT NULL DEFAULT 1 AFTER \`max_departments\`
        `);
        console.log('✅ Added column max_brands to plans table');
      }

      // Update existing plans with a default value (if needed)
      await sequelize.query(`
        UPDATE plans 
        SET max_brands = 1 
        WHERE max_brands IS NULL OR max_brands = 0
      `);
      console.log('✅ Updated existing plans with max_brands = 1');

      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column name')) {
        console.log('⚠️  Column max_brands already exists in plans table');
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addMaxBrandsToPlans();

