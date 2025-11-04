const { sequelize } = require('../config/database');
const { EmailTemplate } = require('../models');

async function createTicketEmailTemplates() {
  try {
    console.log('🔧 Creating ticket email templates...');

    // Check if templates already exist
    const existingTicketCreated = await EmailTemplate.findOne({
      where: { type: 'ticket_created' }
    });
    
    const existingTicketReply = await EmailTemplate.findOne({
      where: { type: 'ticket_reply' }
    });

    if (existingTicketCreated && existingTicketReply) {
      console.log('✅ Ticket email templates already exist');
      await sequelize.close();
      return;
    }

    // Ticket Created Template
    if (!existingTicketCreated) {
      await EmailTemplate.create({
        name: 'Ticket Created - Customer Notification',
        type: 'ticket_created',
        subject: 'Thank you for contacting us - Ticket #{ticket_id}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">Ticket Created</h2>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Hello {customer_name},</p>
              <p>Thank you for contacting us. We have received your support request and created a ticket for you.</p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 150px;">Ticket ID:</td>
                    <td style="padding: 8px 0;">#{ticket_id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                    <td style="padding: 8px 0;">{ticket_subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        {ticket_status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Created:</td>
                    <td style="padding: 8px 0;">{created_at}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">Your Message:</h4>
                <p style="color: #856404; margin: 0; white-space: pre-wrap;">{ticket_message}</p>
              </div>

              <p>Our support team will review your ticket and get back to you as soon as possible. You can track the status of your ticket by clicking the button below.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{ticket_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                  View Ticket
                </a>
              </div>

              <p>If you have any additional information or questions, please reply to this email or update your ticket.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px; margin: 0;">
                This is an automated email from NxChat Support. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
        text_content: `Hello {customer_name},

Thank you for contacting us. We have received your support request and created a ticket for you.

Ticket Details:
- Ticket ID: #{ticket_id}
- Subject: {ticket_subject}
- Status: {ticket_status}
- Created: {created_at}

Your Message:
{ticket_message}

Our support team will review your ticket and get back to you as soon as possible. You can view your ticket at: {ticket_url}

If you have any additional information or questions, please reply to this email or update your ticket.

This is an automated email from NxChat Support.`,
        variables: ['customer_name', 'ticket_id', 'ticket_subject', 'ticket_message', 'ticket_status', 'ticket_url', 'created_at'],
        description: 'Email sent to customers when a new ticket is created from the offline form or through the support system.',
        is_active: true
      });
      console.log('✅ Created "Ticket Created" template');
    }

    // Ticket Reply Template
    if (!existingTicketReply) {
      await EmailTemplate.create({
        name: 'Ticket Reply - Customer Notification',
        type: 'ticket_reply',
        subject: 'Re: Ticket #{ticket_id} - {ticket_subject}',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">New Reply to Your Ticket</h2>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Hello {customer_name},</p>
              <p>You have received a new reply to your support ticket from our team.</p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #333;">Ticket Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 150px;">Ticket ID:</td>
                    <td style="padding: 8px 0;">#{ticket_id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                    <td style="padding: 8px 0;">{ticket_subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Replied by:</td>
                    <td style="padding: 8px 0;">{agent_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Replied at:</td>
                    <td style="padding: 8px 0;">{replied_at}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h4 style="margin-top: 0; color: #155724;">Reply from {agent_name}:</h4>
                <div style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
                  <p style="margin: 0; white-space: pre-wrap; color: #333;">{reply_message}</p>
                </div>
              </div>

              <p>If you have any additional questions or need further assistance, please reply to this email or update your ticket.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{ticket_url}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                  View Ticket & Reply
                </a>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px; margin: 0;">
                This is an automated email from NxChat Support. You can reply to this email to add a response to your ticket.
              </p>
            </div>
          </div>
        `,
        text_content: `Hello {customer_name},

You have received a new reply to your support ticket from our team.

Ticket Information:
- Ticket ID: #{ticket_id}
- Subject: {ticket_subject}
- Replied by: {agent_name}
- Replied at: {replied_at}

Reply from {agent_name}:
{reply_message}

If you have any additional questions or need further assistance, please reply to this email or update your ticket at: {ticket_url}

This is an automated email from NxChat Support. You can reply to this email to add a response to your ticket.`,
        variables: ['customer_name', 'ticket_id', 'ticket_subject', 'agent_name', 'reply_message', 'ticket_url', 'replied_at'],
        description: 'Email sent to customers when an agent replies to their support ticket.',
        is_active: true
      });
      console.log('✅ Created "Ticket Reply" template');
    }

    console.log('✅ All ticket email templates created successfully');
  } catch (error) {
    console.error('❌ Failed to create ticket email templates:', error.message || error);
  } finally {
    await sequelize.close();
  }
}

// Run directly
createTicketEmailTemplates();

