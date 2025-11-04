const { sequelize } = require('../config/database');

async function forceAutoIncrementUsers() {
  try {
    console.log('🔧 Forcing AUTO_INCREMENT on users.id ...');
    await sequelize.query(`
      ALTER TABLE \`users\` 
      MODIFY \`id\` INT NOT NULL AUTO_INCREMENT;
    `);
    console.log('✅ users.id set to AUTO_INCREMENT');
  } catch (error) {
    console.error('❌ Failed to set AUTO_INCREMENT on users.id:', error.message || error);
  } finally {
    await sequelize.close();
  }
}

forceAutoIncrementUsers();


