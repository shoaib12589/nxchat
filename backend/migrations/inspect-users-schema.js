const { sequelize } = require('../config/database');

async function inspect() {
  try {
    const [rows] = await sequelize.query('SHOW CREATE TABLE `users`;');
    console.log(rows[0]['Create Table']);
  } catch (e) {
    console.error('Inspection failed:', e.message || e);
  } finally {
    await sequelize.close();
  }
}

inspect();


