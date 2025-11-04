/**
 * Script to cleanup duplicate visitor activity entries and add unique index
 * This ensures only one row per visitor (per tenant) exists in visitor_activities table
 * Run: node scripts/cleanup-duplicate-visitor-activities.js
 */

const { sequelize } = require('../config/database');
const { VisitorActivity } = require('../models');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function cleanupDuplicateActivities() {
  try {
    console.log('🧹 Starting cleanup of duplicate visitor activities...\n');

    // Step 1: Find all duplicate entries
    console.log('📊 Step 1: Finding duplicate entries...');
    const duplicates = await sequelize.query(`
      SELECT visitor_id, tenant_id, COUNT(*) as count
      FROM visitor_activities
      GROUP BY visitor_id, tenant_id
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${duplicates.length} visitors with duplicate activity entries\n`);

    if (duplicates.length > 0) {
      // Step 2: Delete duplicates, keeping only the most recent one
      console.log('🗑️  Step 2: Removing duplicate entries (keeping most recent)...');
      
      for (const dup of duplicates) {
        const result = await sequelize.query(`
          DELETE t1 FROM visitor_activities t1
          INNER JOIN visitor_activities t2
          WHERE t1.visitor_id = :visitorId
            AND t1.tenant_id = :tenantId
            AND t1.id < t2.id
            AND t1.visitor_id = t2.visitor_id
            AND t1.tenant_id = t2.tenant_id
        `, {
          replacements: {
            visitorId: dup.visitor_id,
            tenantId: dup.tenant_id
          },
          type: sequelize.QueryTypes.DELETE
        });

        console.log(`  ✅ Cleaned up duplicates for visitor ${dup.visitor_id} (tenant ${dup.tenant_id})`);
      }

      console.log(`\n✅ Cleaned up duplicates for ${duplicates.length} visitors\n`);
    } else {
      console.log('✅ No duplicate entries found\n');
    }

    // Step 3: Check if unique index already exists
    console.log('🔍 Step 3: Checking for existing unique index...');
    const indexExists = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'visitor_activities'
        AND index_name = 'idx_visitor_activities_unique_visitor'
    `, { type: sequelize.QueryTypes.SELECT });

    const indexCount = indexExists[0]?.count || 0;

    if (indexCount === 0) {
      // Step 4: Add unique index
      console.log('➕ Step 4: Adding unique index...');
      
      await sequelize.query(`
        ALTER TABLE visitor_activities
        ADD UNIQUE INDEX idx_visitor_activities_unique_visitor (visitor_id, tenant_id)
      `);

      console.log('✅ Unique index added successfully\n');
    } else {
      console.log('✅ Unique index already exists\n');
    }

    // Step 5: Verify final state
    console.log('📊 Step 5: Verifying final state...');
    const finalCount = await sequelize.query(`
      SELECT COUNT(*) as total_entries
      FROM visitor_activities
    `, { type: sequelize.QueryTypes.SELECT });

    const uniqueCount = await sequelize.query(`
      SELECT COUNT(DISTINCT CONCAT(visitor_id, '-', tenant_id)) as unique_visitors
      FROM visitor_activities
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`  Total activity entries: ${finalCount[0]?.total_entries || 0}`);
    console.log(`  Unique visitors: ${uniqueCount[0]?.unique_visitors || 0}`);
    
    if (finalCount[0]?.total_entries === uniqueCount[0]?.unique_visitors) {
      console.log('\n✅ Perfect! Each visitor has exactly one activity entry.\n');
    } else {
      console.log('\n⚠️  Warning: Some visitors still have multiple entries. Please investigate.\n');
    }

    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

cleanupDuplicateActivities();

