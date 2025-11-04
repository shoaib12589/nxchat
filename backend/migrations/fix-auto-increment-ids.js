const { sequelize } = require('../config/database');

async function fixAutoIncrementIds() {
  try {
    console.log('🔧 Ensuring AUTO_INCREMENT on primary key columns...');

    // Helper: ensure table has AUTO_INCREMENT primary id
    async function ensureAutoIncrementId(table) {
      try {
        // Check current column definition
        const [rows] = await sequelize.query(`
          SHOW COLUMNS FROM \`${table}\` LIKE 'id';
        `);

        if (!rows || rows.length === 0) {
          console.log(`⚠️  Table ${table} has no 'id' column, skipping`);
          return;
        }

        const col = rows[0];
        const isAuto = (col.Extra || '').toLowerCase().includes('auto_increment');
        const isPrimary = (col.Key || '').toLowerCase() === 'pri';

        if (isAuto && isPrimary) {
          console.log(`✅ ${table}.id already AUTO_INCREMENT PRIMARY KEY`);
          return;
        }

        // Make sure there's a primary key on id
        if (!isPrimary) {
          console.log(`➡️  Adding PRIMARY KEY on ${table}.id`);
          await sequelize.query(`
            ALTER TABLE \`${table}\` 
            DROP PRIMARY KEY,
            ADD PRIMARY KEY (id);
          `);
        }

        // Ensure AUTO_INCREMENT attribute
        if (!isAuto) {
          console.log(`➡️  Adding AUTO_INCREMENT to ${table}.id`);
          await sequelize.query(`
            ALTER TABLE \`${table}\` 
            MODIFY id INT NOT NULL AUTO_INCREMENT;
          `);
        }

        console.log(`✅ Fixed ${table}.id`);
      } catch (err) {
        // If DROP PRIMARY KEY fails because there isn't one, try only MODIFY
        if (err && err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`ℹ️  ${table} had no PRIMARY KEY, setting AUTO_INCREMENT and PRIMARY KEY`);
          await sequelize.query(`
            ALTER TABLE \`${table}\` 
            MODIFY id INT NOT NULL AUTO_INCREMENT,
            ADD PRIMARY KEY (id);
          `);
          return;
        }
        console.error(`❌ Failed updating ${table}.id:`, err.message || err);
      }
    }

    // Fix users table (primary source of current error)
    await ensureAutoIncrementId('users');

    console.log('🎉 Migration finished');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run directly
fixAutoIncrementIds();


