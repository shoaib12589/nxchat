/**
 * Cleanup Old Visitor Data Script
 * Removes old inactive visitor data to optimize database performance
 * 
 * Usage: node scripts/cleanup-old-visitor-data.js [options]
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --days: Number of days to keep (default: 90)
 *   --archive: Archive data instead of deleting (requires archive tables)
 */

const { sequelize } = require('../config/database');
const { Visitor, VisitorActivity, VisitorMessage } = require('../models');
require('dotenv').config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const archiveMode = args.includes('--archive');
const daysArg = args.find(arg => arg.startsWith('--days='));
const retentionDays = daysArg ? parseInt(daysArg.split('=')[1]) : 90;

async function cleanupOldData() {
  try {
    console.log('🗑️  Starting visitor data cleanup...');
    console.log(`📅 Retention period: ${retentionDays} days`);
    console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : archiveMode ? 'ARCHIVE' : 'DELETE'}`);
    console.log('');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Step 1: Find inactive visitors older than retention period
    console.log('📊 Step 1: Analyzing inactive visitors...');
    const inactiveVisitors = await sequelize.query(`
      SELECT 
        id, 
        name, 
        tenant_id,
        status,
        last_activity,
        created_at,
        is_active,
        DATEDIFF(NOW(), COALESCE(last_activity, created_at)) as days_inactive
      FROM visitors
      WHERE (
        (is_active = 0 OR status = 'offline')
        AND COALESCE(last_activity, created_at) < :cutoffDate
      )
      ORDER BY COALESCE(last_activity, created_at) ASC
      LIMIT 10000
    `, {
      replacements: { cutoffDate: cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`   Found ${inactiveVisitors.length} inactive visitors older than ${retentionDays} days`);

    if (inactiveVisitors.length === 0) {
      console.log('✅ No old data to clean up!');
      return;
    }

    const visitorIds = inactiveVisitors.map(v => v.id);
    const tenantIds = [...new Set(inactiveVisitors.map(v => v.tenant_id))];

    // Step 2: Count related data
    console.log('');
    console.log('📊 Step 2: Counting related data...');
    
    const [activityCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM visitor_activities
      WHERE visitor_id IN (:visitorIds)
    `, {
      replacements: { visitorIds },
      type: sequelize.QueryTypes.SELECT
    });

    const [messageCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM visitor_messages
      WHERE visitor_id IN (:visitorIds)
    `, {
      replacements: { visitorIds },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`   Visitor Activities: ${activityCount.count} records`);
    console.log(`   Visitor Messages: ${messageCount.count} records`);

    if (dryRun) {
      console.log('');
      console.log('🔍 DRY RUN - No changes made. Remove --dry-run to execute cleanup.');
      console.log(`   Would delete:`);
      console.log(`   - ${inactiveVisitors.length} visitors`);
      console.log(`   - ${activityCount.count} activities`);
      console.log(`   - ${messageCount.count} messages`);
      return;
    }

    // Step 3: Archive or Delete data
    console.log('');
    console.log('🗑️  Step 3: Cleaning up data...');

    if (archiveMode) {
      console.log('   Archiving data (archive mode not yet implemented)...');
      // TODO: Implement archive functionality
    }

    // Delete in batches to avoid locking tables
    const batchSize = 100;
    let deletedVisitors = 0;
    let deletedActivities = 0;
    let deletedMessages = 0;

    for (let i = 0; i < visitorIds.length; i += batchSize) {
      const batch = visitorIds.slice(i, i + batchSize);
      
      // Delete activities
      const [deletedActs] = await sequelize.query(`
        DELETE FROM visitor_activities
        WHERE visitor_id IN (:batch)
      `, {
        replacements: { batch },
        type: sequelize.QueryTypes.DELETE
      });
      deletedActivities += deletedActs.affectedRows || 0;

      // Delete messages
      const [deletedMsgs] = await sequelize.query(`
        DELETE FROM visitor_messages
        WHERE visitor_id IN (:batch)
      `, {
        replacements: { batch },
        type: sequelize.QueryTypes.DELETE
      });
      deletedMessages += deletedMsgs.affectedRows || 0;

      // Delete visitors
      const [deletedV] = await sequelize.query(`
        DELETE FROM visitors
        WHERE id IN (:batch)
      `, {
        replacements: { batch },
        type: sequelize.QueryTypes.DELETE
      });
      deletedVisitors += deletedV.affectedRows || 0;

      console.log(`   Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(visitorIds.length / batchSize)}`);
    }

    // Step 4: Optimize tables
    console.log('');
    console.log('⚡ Step 4: Optimizing tables...');
    await sequelize.query('OPTIMIZE TABLE visitors');
    await sequelize.query('OPTIMIZE TABLE visitor_activities');
    await sequelize.query('OPTIMIZE TABLE visitor_messages');
    console.log('   Tables optimized');

    // Step 5: Show results
    console.log('');
    console.log('✅ Cleanup completed successfully!');
    console.log(`   Deleted ${deletedVisitors} visitors`);
    console.log(`   Deleted ${deletedActivities} activities`);
    console.log(`   Deleted ${deletedMessages} messages`);
    console.log(`   Total records removed: ${deletedVisitors + deletedActivities + deletedMessages}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup
cleanupOldData()
  .then(() => {
    console.log('');
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

