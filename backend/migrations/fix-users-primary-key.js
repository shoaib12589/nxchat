const { sequelize } = require('../config/database');

async function fixUsersPk() {
  try {
    console.log('🔧 Adding PRIMARY KEY to users.id if missing...');
    await sequelize.query('ALTER TABLE `users` ADD PRIMARY KEY (`id`);');
    console.log('✅ PRIMARY KEY added');
  } catch (e) {
    // If PK already exists, ignore
    console.log('ℹ️  PRIMARY KEY may already exist:', e.message || e);
  }

  try {
    console.log('🔧 Setting AUTO_INCREMENT on users.id ...');
    await sequelize.query('ALTER TABLE `users` MODIFY `id` INT(11) NOT NULL AUTO_INCREMENT;');
    console.log('✅ AUTO_INCREMENT set on users.id');
  } catch (e) {
    console.error('❌ Failed to set AUTO_INCREMENT:', e.message || e);
  } finally {
    await sequelize.close();
  }
}

fixUsersPk();


