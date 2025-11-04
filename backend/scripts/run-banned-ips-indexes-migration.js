const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Running banned_ips indexes migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/add_banned_ips_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements and execute them
    // Remove comments and split by semicolon
    const statements = sql
      .split('\n')
      .map(line => {
        // Remove inline comments
        const commentIndex = line.indexOf('--');
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length > 10); // Filter out empty or very short statements
    
    console.log(`📝 Found ${statements.length} index creation statements`);
    
    // Extract index names and create statements
    const indexStatements = [];
    for (const statement of statements) {
      if (statement.trim() && statement.toUpperCase().includes('CREATE INDEX')) {
        // Extract index name from statement
        const indexNameMatch = statement.match(/idx_banned_ips_\w+/i);
        if (indexNameMatch) {
          const indexName = indexNameMatch[0];
          // Remove IF NOT EXISTS since MySQL doesn't support it for indexes
          const cleanStatement = statement.replace(/IF NOT EXISTS\s+/i, '');
          indexStatements.push({ name: indexName, statement: cleanStatement });
        }
      }
    }
    
    console.log(`\n📋 Creating ${indexStatements.length} indexes...\n`);
    
    for (let i = 0; i < indexStatements.length; i++) {
      const { name, statement } = indexStatements[i];
      console.log(`  [${i + 1}/${indexStatements.length}] Creating index: ${name}...`);
      
      try {
        // Check if index already exists
        const [existingIndexes] = await sequelize.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.statistics 
          WHERE table_schema = DATABASE() 
          AND table_name = 'banned_ips' 
          AND index_name = '${name}'
        `);
        
        if (existingIndexes[0].count > 0) {
          console.log(`    ⚠️  Index '${name}' already exists, skipping...`);
        } else {
          await sequelize.query(statement + ';');
          console.log(`    ✅ Index '${name}' created successfully`);
        }
      } catch (error) {
        // If index already exists (duplicate key name error), that's okay
        if (error.original && (
          error.original.code === 'ER_DUP_KEYNAME' || 
          error.original.errno === 1061 ||
          error.original.message.includes('Duplicate key name')
        )) {
          console.log(`    ⚠️  Index '${name}' already exists, skipping...`);
        } else {
          console.error(`    ❌ Failed to create index '${name}':`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ All performance indexes created for banned_ips table');
    
    // Verify indexes were created
    const [results] = await sequelize.query(`
      SHOW INDEXES FROM banned_ips WHERE Key_name LIKE 'idx_banned_ips%';
    `);
    
    console.log(`\n📊 Created ${results.length} indexes:`);
    results.forEach(index => {
      console.log(`   - ${index.Key_name} (${index.Column_name})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('SQL Error:', error.original.message);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();

