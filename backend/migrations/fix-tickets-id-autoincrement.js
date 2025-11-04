const { sequelize } = require('../config/database');

async function fixTicketsIdAutoIncrement() {
  try {
    console.log('🔧 Ensuring AUTO_INCREMENT on tickets.id...');

    // Check current column definition
    const [rows] = await sequelize.query(`
      SHOW COLUMNS FROM \`tickets\` LIKE 'id';
    `);

    if (!rows || rows.length === 0) {
      console.log('⚠️  Table tickets has no id column');
      await sequelize.close();
      return;
    }

    const col = rows[0];
    const isAuto = (col.Extra || '').toLowerCase().includes('auto_increment');
    const isPrimary = (col.Key || '').toLowerCase() === 'pri';

    if (isAuto && isPrimary) {
      console.log('✅ tickets.id already AUTO_INCREMENT PRIMARY KEY');
      await sequelize.close();
      return;
    }

    // Make sure there's a primary key on id
    if (!isPrimary) {
      console.log('➡️  Adding PRIMARY KEY on tickets.id');
      try {
        await sequelize.query(`
          ALTER TABLE \`tickets\` 
          ADD PRIMARY KEY (id);
        `);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') {
          throw err;
        }
        console.log('ℹ️  PRIMARY KEY may already exist');
      }
    }

    // Ensure AUTO_INCREMENT attribute
    if (!isAuto) {
      console.log('➡️  Adding AUTO_INCREMENT to tickets.id');
      await sequelize.query(`
        ALTER TABLE \`tickets\` 
        MODIFY id INT NOT NULL AUTO_INCREMENT;
      `);
    }

    console.log('✅ Fixed tickets.id');
  } catch (error) {
    console.error('❌ Failed to fix tickets.id:', error.message || error);
  } finally {
    await sequelize.close();
  }
}

// Run directly
fixTicketsIdAutoIncrement();

