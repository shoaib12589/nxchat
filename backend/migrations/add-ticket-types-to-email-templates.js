const { sequelize } = require('../config/database');

async function addTicketTypesToEmailTemplates() {
  try {
    console.log('🔧 Adding ticket_created and ticket_reply types to email_templates table...');

    // MySQL doesn't support ALTER ENUM easily, so we need to alter the column
    // First, check current structure
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM \`email_templates\` LIKE 'type';
    `);

    if (columns && columns.length > 0) {
      const col = columns[0];
      const currentType = col.Type;
      
      // Check if ticket_created and ticket_reply are already in the enum
      if (currentType.includes('ticket_created') && currentType.includes('ticket_reply')) {
        console.log('✅ Ticket types already exist in email_templates.type');
        await sequelize.close();
        return;
      }

      console.log('➡️  Current type definition:', currentType);
      console.log('➡️  Modifying ENUM to include ticket_created and ticket_reply...');

      // Modify the ENUM to include the new types
      await sequelize.query(`
        ALTER TABLE \`email_templates\` 
        MODIFY COLUMN \`type\` ENUM(
          'verification',
          'password_reset',
          'welcome',
          'agent_invitation',
          'notification',
          'chat_assignment',
          'ticket_created',
          'ticket_reply',
          'custom'
        ) NOT NULL DEFAULT 'custom';
      `);

      console.log('✅ Successfully added ticket_created and ticket_reply to email_templates.type');
    } else {
      console.log('⚠️  Could not find type column in email_templates');
    }
  } catch (error) {
    console.error('❌ Failed to add ticket types:', error.message || error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run directly
addTicketTypesToEmailTemplates();

