const { sequelize } = require('../config/database');
const { EmailTemplate } = require('../models');

async function createDummyEmailTemplates() {
  try {
    console.log('🔧 Creating dummy email templates for all types...');

    const templateTypes = [
      {
        type: 'verification',
        name: 'Email Verification',
        subject: 'Verify Your Email Address - NxChat',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Complete your registration</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {name},</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">Thank you for registering with NxChat! Please verify your email address by clicking the button below.</p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{verification_link}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; font-size: 14px; margin: 20px 0 0 0;">This link will expire on {expires_at}.</p>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {name},

Thank you for registering with NxChat! Please verify your email address by visiting: {verification_link}

This link will expire on {expires_at}.

Best regards,
The NxChat Team`,
        variables: ['name', 'email', 'verification_link', 'expires_at'],
        description: 'Email sent to users to verify their email address during registration.'
      },
      {
        type: 'password_reset',
        name: 'Password Reset Request',
        subject: 'Reset Your Password - NxChat',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Secure password reset</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {name},</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">We received a request to reset your password. Click the button below to create a new password.</p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 32px; background-color: #f5576c; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">This link will expire on {expires_at}. If you didn't request a password reset, please ignore this email.</p>
              </div>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {name},

We received a request to reset your password. Visit this link to reset it: {reset_link}

This link will expire on {expires_at}. If you didn't request a password reset, please ignore this email.

Best regards,
The NxChat Team`,
        variables: ['name', 'email', 'reset_link', 'expires_at'],
        description: 'Email sent to users when they request a password reset.'
      },
      {
        type: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to NxChat, {name}!',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NxChat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to NxChat!</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Your account is ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {name},</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">Welcome to NxChat! We're excited to have you on board. Your account has been successfully created as a <strong>{role}</strong>.</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">You can now access your dashboard and start using all the features available to you.</p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{login_link}" style="display: inline-block; padding: 14px 32px; background-color: #38ef7d; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Access Dashboard</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #38ef7d;">
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              </div>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {name},

Welcome to NxChat! We're excited to have you on board. Your account has been successfully created as a {role}.

Access your dashboard: {login_link}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The NxChat Team`,
        variables: ['name', 'email', 'login_link', 'role'],
        description: 'Welcome email sent to new users after account creation.'
      },
      {
        type: 'agent_invitation',
        name: 'Agent Invitation',
        subject: 'You\'ve been invited to join {company} as an Agent',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Join Our Team</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">You've been invited as an Agent</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {name},</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">You've been invited to join <strong>{company}</strong> as a support agent on NxChat!</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">Your Login Credentials:</h3>
                <p style="margin: 10px 0; color: #666; font-size: 14px;"><strong>Email:</strong> {email}</p>
                <p style="margin: 10px 0; color: #666; font-size: 14px;"><strong>Credentials:</strong> {login_credentials}</p>
              </div>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{verification_link}" style="display: inline-block; padding: 14px 32px; background-color: #a855f7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Verify Email & Get Started</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;"><strong>Important:</strong> Please verify your email address first, then change your password after your first login.</p>
              </div>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {name},

You've been invited to join {company} as a support agent on NxChat!

Your Login Credentials:
Email: {email}
Credentials: {login_credentials}

Verify your email and get started: {verification_link}

Important: Please verify your email address first, then change your password after your first login.

Best regards,
The NxChat Team`,
        variables: ['name', 'email', 'company', 'login_credentials', 'verification_link'],
        description: 'Email sent to agents when they are invited to join a company.'
      },
      {
        type: 'notification',
        name: 'General Notification',
        subject: 'Notification: {message}',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Notification</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Important update</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {name},</p>
              <div style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">
                {message}
              </div>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{action_url}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">View Details</a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; font-size: 13px; margin: 20px 0 0 0;">Sent on {timestamp}</p>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {name},

{message}

View details: {action_url}

Sent on {timestamp}

Best regards,
The NxChat Team`,
        variables: ['name', 'message', 'action_url', 'timestamp'],
        description: 'General notification email template for various system notifications.'
      },
      {
        type: 'chat_assignment',
        name: 'Chat Assignment Notification',
        subject: 'New Chat Assigned - {customer_name}',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Chat Assignment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Chat Assigned</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Customer waiting for response</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello {agent_name},</p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">A new chat has been assigned to you from customer: <strong style="color: #4f46e5;">{customer_name}</strong></p>
              <p style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 30px 0;">Please respond to the customer as soon as possible to provide excellent service.</p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{chat_url}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">View Chat</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 30px; padding: 20px; background-color: #eff6ff; border-radius: 6px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">Quick response times lead to better customer satisfaction. Thank you for your dedication!</p>
              </div>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello {agent_name},

A new chat has been assigned to you from customer: {customer_name}

Please respond to the customer as soon as possible to provide excellent service.

View chat: {chat_url}

Best regards,
The NxChat Team`,
        variables: ['agent_name', 'customer_name', 'chat_url'],
        description: 'Email notification sent to agents when a new chat is assigned to them.'
      },
      {
        type: 'custom',
        name: 'Custom Email Template',
        subject: 'Custom Email from NxChat',
        html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Custom Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello,</p>
              <div style="color: #555555; font-size: 15px; line-height: 1.8;">
                <p>This is a custom email template. Customize it with your own content and variables.</p>
              </div>
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px;">Best regards,<br><strong style="color: #667eea;">The NxChat Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">This is an automated email from <strong style="color: #667eea;">NxChat</strong>.</p>
              <p style="margin: 0; color: #999999; font-size: 12px;">© 2024 NxChat. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text_content: `Hello,

This is a custom email template. Customize it with your own content and variables.

Best regards,
The NxChat Team`,
        variables: [],
        description: 'A custom email template that can be fully customized for any purpose.'
      }
    ];

    for (const templateData of templateTypes) {
      const existing = await EmailTemplate.findOne({
        where: { type: templateData.type }
      });

      if (!existing) {
        await EmailTemplate.create({
          name: templateData.name,
          type: templateData.type,
          subject: templateData.subject,
          html_content: templateData.html_content,
          text_content: templateData.text_content,
          variables: templateData.variables,
          description: templateData.description,
          is_active: true
        });
        console.log(`✅ Created "${templateData.name}" template`);
      } else {
        console.log(`⏭️  "${templateData.name}" template already exists, skipping`);
      }
    }

    console.log('✅ All dummy email templates created successfully!');
  } catch (error) {
    console.error('❌ Failed to create dummy email templates:', error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await sequelize.close();
  }
}

// Run directly
createDummyEmailTemplates();

