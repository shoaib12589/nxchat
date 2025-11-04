/**
 * Complete Visitor Tables Optimization Script
 * Runs all optimization steps: indexes, cleanup, and analysis
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
require('dotenv').config();

async function runOptimization() {
  try {
    console.log('🚀 Starting Complete Visitor Tables Optimization\n');
    console.log('═'.repeat(80));
    console.log('');

    // Step 1: Add indexes
    console.log('📊 Step 1: Adding Performance Indexes...');
    console.log('─'.repeat(80));
    
    const migrationPath = path.join(__dirname, '../migrations/optimize_visitor_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments and split into statements
    const statements = sql
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('--');
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length > 10);

    let indexCount = 0;
    for (const statement of statements) {
      if (statement.toUpperCase().includes('CREATE INDEX')) {
        try {
          // Extract index name
          const indexNameMatch = statement.match(/idx_\w+/i);
          if (indexNameMatch) {
            const indexName = indexNameMatch[0];
            
            // Check if index exists
            const [existing] = await sequelize.query(`
              SELECT COUNT(*) as count 
              FROM information_schema.statistics 
              WHERE table_schema = DATABASE() 
              AND index_name = '${indexName}'
            `);
            
            if (existing[0].count === 0) {
              // Remove IF NOT EXISTS since MySQL doesn't support it
              const cleanStatement = statement.replace(/IF NOT EXISTS\s+/i, '');
              await sequelize.query(cleanStatement + ';');
              console.log(`   ✅ Created index: ${indexName}`);
              indexCount++;
            } else {
              console.log(`   ⚠️  Index already exists: ${indexName}`);
            }
          }
        } catch (error) {
          if (error.original && (
            error.original.code === 'ER_DUP_KEYNAME' || 
            error.original.errno === 1061
          )) {
            console.log(`   ⚠️  Index already exists (duplicate key)`);
          } else {
            console.error(`   ❌ Failed: ${error.message}`);
          }
        }
      } else if (statement.toUpperCase().includes('OPTIMIZE TABLE')) {
        try {
          await sequelize.query(statement + ';');
          const tableName = statement.match(/TABLE\s+(\w+)/i)?.[1];
          console.log(`   ✅ OPTIMIZE ${tableName || 'table'}`);
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      } else if (statement.toUpperCase().includes('ANALYZE TABLE')) {
        try {
          await sequelize.query(statement + ';');
          const tableName = statement.match(/TABLE\s+(\w+)/i)?.[1];
          console.log(`   ✅ ${statement.split(' ')[0].toUpperCase()} ${tableName || 'table'}`);
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      }
    }

    console.log(`\n   Created ${indexCount} new indexes`);
    console.log('');

    // Step 2: Analyze current state
    console.log('📊 Step 2: Analyzing Current State...');
    console.log('─'.repeat(80));
    
    const { exec } = require('child_process');
    const analyzeScript = path.join(__dirname, 'analyze-visitor-tables.js');
    
    await new Promise((resolve, reject) => {
      exec(`node ${analyzeScript}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Analysis error: ${error}`);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });

    console.log('');
    console.log('✅ Optimization completed!');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Review the analysis above');
    console.log('   2. Run cleanup script if needed: node scripts/cleanup-old-visitor-data.js --days=90');
    console.log('   3. Monitor query performance after optimization');
    console.log('');

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    throw error;
  }
}

// Run optimization
runOptimization()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

