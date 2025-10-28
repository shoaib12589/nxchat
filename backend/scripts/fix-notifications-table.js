const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixNotificationsTable() {
  let connection;
  
  try {
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DB || 'nxchat',
      port: process.env.MYSQL_PORT || 3306
    });

    console.log('Connected to MySQL database');

    // Check if notifications table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'notifications'"
    );

    if (tables.length === 0) {
      console.log('Creating notifications table...');
      
      // Create notifications table
      await connection.execute(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type ENUM('new_chat', 'new_message', 'chat_transfer', 'ai_alert', 'ticket_assigned', 'system_announcement') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
          read_at DATETIME NULL,
          action_url VARCHAR(500) NULL,
          metadata JSON NULL DEFAULT ('{}'),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_read (read),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Notifications table created successfully');
    } else {
      console.log('Notifications table exists, checking columns...');
      
      // Check if read column exists
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM notifications LIKE 'read'"
      );

      if (columns.length === 0) {
        console.log('Adding missing read column...');
        
        // Add read column
        await connection.execute(`
          ALTER TABLE notifications 
          ADD COLUMN \`read\` BOOLEAN NOT NULL DEFAULT FALSE AFTER message
        `);
        
        console.log('✅ Read column added successfully');
      } else {
        console.log('✅ Read column already exists');
      }

      // Check if read_at column exists
      const [readAtColumns] = await connection.execute(
        "SHOW COLUMNS FROM notifications LIKE 'read_at'"
      );

      if (readAtColumns.length === 0) {
        console.log('Adding missing read_at column...');
        
        // Add read_at column
        await connection.execute(`
          ALTER TABLE notifications 
          ADD COLUMN read_at DATETIME NULL AFTER \`read\`
        `);
        
        console.log('✅ Read_at column added successfully');
      } else {
        console.log('✅ Read_at column already exists');
      }

      // Check if action_url column exists
      const [actionUrlColumns] = await connection.execute(
        "SHOW COLUMNS FROM notifications LIKE 'action_url'"
      );

      if (actionUrlColumns.length === 0) {
        console.log('Adding missing action_url column...');
        
        // Add action_url column
        await connection.execute(`
          ALTER TABLE notifications 
          ADD COLUMN action_url VARCHAR(500) NULL AFTER read_at
        `);
        
        console.log('✅ Action_url column added successfully');
      } else {
        console.log('✅ Action_url column already exists');
      }

      // Check if metadata column exists
      const [metadataColumns] = await connection.execute(
        "SHOW COLUMNS FROM notifications LIKE 'metadata'"
      );

      if (metadataColumns.length === 0) {
        console.log('Adding missing metadata column...');
        
        // Add metadata column
        await connection.execute(`
          ALTER TABLE notifications 
          ADD COLUMN metadata JSON NULL DEFAULT ('{}') AFTER action_url
        `);
        
        console.log('✅ Metadata column added successfully');
      } else {
        console.log('✅ Metadata column already exists');
      }
    }

    // Show final table structure
    console.log('\n📋 Final notifications table structure:');
    const [finalColumns] = await connection.execute(
      "DESCRIBE notifications"
    );
    
    finalColumns.forEach(column => {
      console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });

    console.log('\n✅ Notifications table fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing notifications table:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the fix
fixNotificationsTable();
