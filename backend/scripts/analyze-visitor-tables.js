/**
 * Analyze Visitor Tables Script
 * Provides detailed analysis of visitor-related tables for optimization
 */

const { sequelize } = require('../config/database');
require('dotenv').config();

async function analyzeTables() {
  try {
    console.log('📊 Analyzing Visitor Tables...\n');

    // Get table sizes
    const tableSizes = await sequelize.query(`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
        table_rows,
        ROUND((data_length / 1024 / 1024), 2) AS data_mb,
        ROUND((index_length / 1024 / 1024), 2) AS index_mb
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      AND table_name IN ('visitors', 'visitor_activities', 'visitor_messages')
      ORDER BY (data_length + index_length) DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📈 Table Sizes:');
    console.log('─'.repeat(80));
    tableSizes.forEach(table => {
      console.log(`${table.table_name.padEnd(25)} | ${String(table.size_mb).padStart(10)} MB | ${String(table.table_rows).padStart(12)} rows`);
      console.log(`  Data: ${table.data_mb} MB | Indexes: ${table.index_mb} MB`);
    });
    console.log('');

    // Get visitor statistics
    const visitorStatsResult = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline,
        COUNT(CASE WHEN last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as old_30d,
        COUNT(CASE WHEN last_activity < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 END) as old_90d,
        COUNT(CASE WHEN last_activity < DATE_SUB(NOW(), INTERVAL 180 DAY) THEN 1 END) as old_180d
      FROM visitors
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    const visitorStats = visitorStatsResult[0] || {};

    console.log('👥 Visitor Statistics:');
    console.log('─'.repeat(80));
    console.log(`Total Visitors:          ${visitorStats.total || 0}`);
    console.log(`Active Visitors:         ${visitorStats.active || 0}`);
    console.log(`Inactive Visitors:       ${visitorStats.inactive || 0}`);
    console.log(`Offline Visitors:        ${visitorStats.offline || 0}`);
    console.log(`Inactive > 30 days:      ${visitorStats.old_30d || 0}`);
    console.log(`Inactive > 90 days:      ${visitorStats.old_90d || 0}`);
    console.log(`Inactive > 180 days:     ${visitorStats.old_180d || 0}`);
    console.log('');

    // Get activity statistics
    const activityStatsResult = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT tenant_id) as tenants,
        MIN(timestamp) as oldest,
        MAX(timestamp) as newest
      FROM visitor_activities
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    const activityStats = activityStatsResult[0] || {};

    console.log('📝 Activity Statistics:');
    console.log('─'.repeat(80));
    console.log(`Total Activities:        ${activityStats.total || 0}`);
    console.log(`Unique Visitors:         ${activityStats.unique_visitors || 0}`);
    console.log(`Tenants:                 ${activityStats.tenants || 0}`);
    console.log(`Oldest Activity:         ${activityStats.oldest || 'N/A'}`);
    console.log(`Newest Activity:         ${activityStats.newest || 'N/A'}`);
    console.log(`Avg per Visitor:         ${Math.round((activityStats.total || 0) / (activityStats.unique_visitors || 1))}`);
    console.log('');

    // Get message statistics
    const messageStatsResult = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT tenant_id) as tenants,
        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM visitor_messages
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    const messageStats = messageStatsResult[0] || {};

    console.log('💬 Message Statistics:');
    console.log('─'.repeat(80));
    console.log(`Total Messages:          ${messageStats.total || 0}`);
    console.log(`Unique Visitors:         ${messageStats.unique_visitors || 0}`);
    console.log(`Tenants:                 ${messageStats.tenants || 0}`);
    console.log(`Unread Messages:         ${messageStats.unread || 0}`);
    console.log(`Oldest Message:          ${messageStats.oldest || 'N/A'}`);
    console.log(`Newest Message:          ${messageStats.newest || 'N/A'}`);
    console.log(`Avg per Visitor:         ${Math.round((messageStats.total || 0) / (messageStats.unique_visitors || 1))}`);
    console.log('');

    // Get index information
    const indexes = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        CARDINALITY,
        INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('visitors', 'visitor_activities', 'visitor_messages')
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('🔍 Index Information:');
    console.log('─'.repeat(80));
    let currentTable = '';
    indexes.forEach(idx => {
      if (idx.TABLE_NAME !== currentTable) {
        currentTable = idx.TABLE_NAME;
        console.log(`\n${currentTable}:`);
      }
      console.log(`  ${idx.INDEX_NAME.padEnd(40)} | ${idx.COLUMN_NAME.padEnd(20)} | ${idx.CARDINALITY || 'N/A'}`);
    });
    console.log('');

    // Get slow query recommendations
    console.log('💡 Optimization Recommendations:');
    console.log('─'.repeat(80));
    
    if (visitorStats.old_90d > 1000) {
      console.log(`⚠️  Found ${visitorStats.old_90d} visitors inactive > 90 days`);
      console.log(`   Recommendation: Run cleanup script with --days=90`);
    }
    
    if (activityStats.total > 1000000) {
      console.log(`⚠️  Activity table has ${activityStats.total} records`);
      console.log(`   Recommendation: Consider archiving old activity data`);
    }
    
    if (messageStats.total > 1000000) {
      console.log(`⚠️  Messages table has ${messageStats.total} records`);
      console.log(`   Recommendation: Consider archiving old message data`);
    }

    const totalSizeMB = tableSizes.reduce((sum, t) => sum + parseFloat(t.size_mb || 0), 0);
    if (totalSizeMB > 1000) {
      console.log(`⚠️  Total table size is ${totalSizeMB.toFixed(2)} MB`);
      console.log(`   Recommendation: Run OPTIMIZE TABLE and cleanup old data`);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Run analysis
analyzeTables()
  .then(() => {
    console.log('✅ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });

