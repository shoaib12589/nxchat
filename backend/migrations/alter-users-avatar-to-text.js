const { sequelize } = require('../config/database');

async function alterUsersAvatarToText() {
  try {
    console.log('🔧 Altering users.avatar to TEXT ...');
    await sequelize.query('ALTER TABLE `users` MODIFY `avatar` TEXT NULL;');
    console.log('✅ users.avatar column set to TEXT');
  } catch (e) {
    console.error('❌ Failed altering users.avatar to TEXT:', e.message || e);
  } finally {
    await sequelize.close();
  }
}

alterUsersAvatarToText();


