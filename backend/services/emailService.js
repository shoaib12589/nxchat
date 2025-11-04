const nodemailer = require('nodemailer');

// Get SMTP settings from database or environment variables
const getSMTPSettings = async () => {
  try {
    const { SystemSetting } = require('../models');
    const { Op } = require('sequelize');
    const settings = await SystemSetting.findAll({
      where: { 
        setting_key: { 
          [Op.in]: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure', 'smtp_from_name'] 
        } 
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.value;
    });

    // Use database settings if available, otherwise fall back to environment variables
    const config = {
      host: settingsObj.smtp_host || process.env.EMAIL_HOST,
      port: parseInt(settingsObj.smtp_port || process.env.EMAIL_PORT || 587),
      secure: settingsObj.smtp_secure === 'true' || process.env.EMAIL_PORT == 465,
      auth: {
        user: settingsObj.smtp_user || process.env.EMAIL_USER,
        pass: settingsObj.smtp_password || process.env.EMAIL_PASS
      },
      from_name: settingsObj.smtp_from_name || process.env.EMAIL_FROM_NAME || null
    };

    // Validate that required fields are present
    if (!config.host || !config.auth.user || !config.auth.pass) {
      throw new Error('SMTP configuration is incomplete. Please check your email settings.');
    }

    return config;
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    // Fall back to environment variables
    const config = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || 587),
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      from_name: process.env.EMAIL_FROM_NAME || null
    };

    // Validate that required fields are present
    if (!config.host || !config.auth.user || !config.auth.pass) {
      throw new Error('SMTP configuration is incomplete. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your environment variables or database settings.');
    }

    return config;
  }
};

// Helper function to format the "from" field
const formatFromAddress = (email, name) => {
  if (name && name.trim()) {
    // Format: "Name <email@example.com>"
    return `${name.trim()} <${email}>`;
  }
  // If no name provided, just return the email
  return email;
};

// Create email transporter
const createTransporter = async () => {
  const smtpConfig = await getSMTPSettings();
  return nodemailer.createTransport(smtpConfig);
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: 'Verify Your Email - NxChat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome to NxChat!</h2>
          <p>Thank you for registering with NxChat. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">If you didn't create an account with NxChat, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: 'Reset Your Password - NxChat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Password Reset Request</h2>
          <p>You requested a password reset for your NxChat account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name, role) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: 'Welcome to NxChat!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome to NxChat, ${name}!</h2>
          <p>Your account has been successfully created and verified. You can now access your ${role} dashboard.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Dashboard</a>
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Thank you for choosing NxChat!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send notification email
const sendNotificationEmail = async (email, subject, message, actionUrl = null) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">NxChat Notification</h2>
          <p>${message}</p>
          ${actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Details</a>
            </div>
          ` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from NxChat.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
};

// Send chat assignment notification
const sendChatAssignmentEmail = async (email, agentName, customerName) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: 'New Chat Assigned - NxChat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">New Chat Assignment</h2>
          <p>Hello ${agentName},</p>
          <p>A new chat has been assigned to you from customer: <strong>${customerName}</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/agent/chats" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Chat</a>
          </div>
          <p>Please respond to the customer as soon as possible to provide excellent service.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from NxChat.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Chat assignment email sent to ${email}`);
  } catch (error) {
    console.error('Error sending chat assignment email:', error);
    throw error;
  }
};

// Test email configuration
const testEmailConfiguration = async (testEmail = null) => {
  try {
    // First, validate SMTP settings
    const smtpSettings = await getSMTPSettings();
    
    if (!smtpSettings.host || !smtpSettings.auth.user || !smtpSettings.auth.pass) {
      return { 
        success: false, 
        message: 'SMTP configuration is incomplete. Please configure email settings first.' 
      };
    }

    const transporter = await createTransporter();
    
    // Verify connection
    await transporter.verify();
    console.log('Email configuration is valid');
    
    // If test email is provided, send a test email
    if (testEmail) {
      const mailOptions = {
        from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
        to: testEmail,
        subject: 'SMTP Configuration Test - NxChat',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">SMTP Configuration Test Successful!</h2>
            <p>This is a test email from NxChat to verify that your SMTP settings are configured correctly.</p>
            <p>If you received this email, it means your SMTP configuration is working properly.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">This is an automated test email from NxChat.</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`Test email sent to ${testEmail}`);
    }
    
    return { success: true, message: testEmail ? `Test email sent successfully to ${testEmail}` : 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to test email configuration. Please check your SMTP settings.' 
    };
  }
};

// Send agent invitation email
const sendAgentInvitation = async (email, firstName, verificationToken, tempPassword) => {
  try {
    const transporter = await createTransporter();
    const smtpSettings = await getSMTPSettings();
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: formatFromAddress(smtpSettings.auth.user, smtpSettings.from_name),
      to: email,
      subject: 'You\'ve been invited to join NxChat as an Agent',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome to NxChat, ${firstName}!</h2>
          <p>You've been invited to join our support team as an agent. Here are your login credentials:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Login Information:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to NxChat</a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">Important:</h4>
            <ul style="color: #856404; margin: 0;">
              <li>Please verify your email address first by clicking the verification link below</li>
              <li>Change your password after your first login</li>
              <li>This temporary password will expire in 7 days</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
          </div>
          
          <p>If the buttons don't work, you can also copy and paste these links into your browser:</p>
          <p><strong>Login:</strong> <span style="word-break: break-all; color: #666;">${loginUrl}</span></p>
          <p><strong>Verify Email:</strong> <span style="word-break: break-all; color: #666;">${verificationUrl}</span></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, please contact your administrator.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Agent invitation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending agent invitation email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
  sendChatAssignmentEmail,
  sendAgentInvitation,
  testEmailConfiguration,
  getSMTPSettings,
  createTransporter
};