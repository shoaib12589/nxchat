const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Running banned_ips table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create_banned_ips_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL
    await sequelize.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ banned_ips table created');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('SQL Error:', error.original.message);
    }
    process.exit(1);
  }
}

// Run the migration
runMigration();

