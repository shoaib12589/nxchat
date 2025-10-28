const { sequelize } = require('../config/database');

async function addVisitorTrackingFields() {
  try {
    console.log('🚀 Starting visitor tracking fields migration...');

    const columnsToAdd = [
      { name: 'source', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Traffic source (Google, Bing, Direct, etc.)"' },
      { name: 'medium', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Traffic medium (organic, social, referral, etc.)"' },
      { name: 'campaign', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Campaign name from UTM"' },
      { name: 'content', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Content identifier from UTM"' },
      { name: 'term', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Term/keyword from UTM"' },
      { name: 'keyword', type: 'VARCHAR(500) DEFAULT NULL COMMENT "Search keyword used by visitor"' },
      { name: 'search_engine', type: 'VARCHAR(255) DEFAULT NULL COMMENT "Search engine name (Google, Bing, etc.)"' },
      { name: 'landing_page', type: 'TEXT DEFAULT NULL COMMENT "First page visited in session"' }
    ];

    for (const column of columnsToAdd) {
      try {
        await sequelize.query(`
          ALTER TABLE visitors 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added column ${column.name} to visitors table`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column ${column.name} already exists in visitors table`);
        } else {
          throw err;
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addVisitorTrackingFields();

