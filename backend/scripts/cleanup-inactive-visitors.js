const { Visitor } = require('../models');

async function cleanupInactiveVisitors() {
  try {
    console.log('Starting cleanup of inactive visitors...');
    
    // Find visitors who haven't been active for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const inactiveVisitors = await Visitor.findAll({
      where: {
        status: ['online', 'idle', 'away'],
        last_activity: {
          [require('sequelize').Op.lt]: thirtyMinutesAgo
        }
      }
    });
    
    console.log(`Found ${inactiveVisitors.length} inactive visitors`);
    
    // Update their status to offline
    for (const visitor of inactiveVisitors) {
      await visitor.update({ status: 'offline' });
      console.log(`Marked visitor ${visitor.id} as offline`);
    }
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during visitor cleanup:', error);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupInactiveVisitors().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = cleanupInactiveVisitors;
