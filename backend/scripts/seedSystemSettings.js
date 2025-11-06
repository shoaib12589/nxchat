const { sequelize } = require('../config/database');
const { SystemSetting } = require('../models');
const { getFrontendUrl } = require('../../config/urls');

async function seedSystemSettings() {
  try {
    console.log('🌱 Seeding system settings...');

    const defaultSettings = [
      // General Settings
      { key: 'site_name', value: 'NxChat', category: 'general', description: 'The name of the application' },
      { key: 'site_description', value: 'Professional Live Chat Platform', category: 'general', description: 'Description of the application' },
      { key: 'site_url', value: getFrontendUrl(), category: 'general', description: 'The base URL of the application' },
      { key: 'support_email', value: 'support@nxchat.com', category: 'general', description: 'Support email address' },
      { key: 'admin_email', value: 'admin@nxchat.com', category: 'general', description: 'Admin email address' },
      
      // Security Settings
      { key: 'enable_registration', value: 'true', category: 'security', description: 'Whether new user registration is enabled' },
      { key: 'require_email_verification', value: 'false', category: 'security', description: 'Whether email verification is required for new users' },
      { key: 'enable_two_factor', value: 'false', category: 'security', description: 'Whether two-factor authentication is enabled' },
      { key: 'session_timeout', value: '30', category: 'security', description: 'Session timeout in minutes' },
      { key: 'max_login_attempts', value: '5', category: 'security', description: 'Maximum login attempts before lockout' },
      
      // Email Settings
      { key: 'smtp_host', value: 'smtp.gmail.com', category: 'email', description: 'SMTP server host' },
      { key: 'smtp_port', value: '587', category: 'email', description: 'SMTP server port' },
      { key: 'smtp_user', value: '', category: 'email', description: 'SMTP username' },
      { key: 'smtp_password', value: '', category: 'email', description: 'SMTP password', is_encrypted: true },
      { key: 'smtp_secure', value: 'false', category: 'email', description: 'Use secure SMTP connection' },
      
      // System Settings
      { key: 'maintenance_mode', value: 'false', category: 'system', description: 'Whether maintenance mode is enabled' },
      { key: 'debug_mode', value: 'false', category: 'system', description: 'Whether debug mode is enabled' },
      { key: 'log_level', value: 'info', category: 'system', description: 'Logging level' },
      { key: 'max_file_size', value: '10485760', category: 'system', description: 'Maximum file upload size in bytes (10MB)' },
      { key: 'allowed_file_types', value: 'jpg,jpeg,png,gif,pdf,doc,docx,txt', category: 'system', description: 'Comma-separated list of allowed file types' },
      
      // Storage Settings
      { key: 'storage_provider', value: 'local', category: 'storage', description: 'Default storage provider' },
      { key: 'storage_bucket', value: '', category: 'storage', description: 'Default storage bucket' },
      { key: 'storage_region', value: '', category: 'storage', description: 'Default storage region' },
      
      // AI Settings
      { key: 'openai_api_key', value: '', category: 'ai', description: 'OpenAI API key', is_encrypted: true },
      { key: 'ai_model', value: 'gpt-3.5-turbo', category: 'ai', description: 'Default AI model to use' },
      { key: 'ai_temperature', value: '0.7', category: 'ai', description: 'AI response temperature' },
      { key: 'ai_max_tokens', value: '1000', category: 'ai', description: 'Maximum tokens for AI responses' },
      { key: 'ai_agent_name', value: 'NxChat Assistant', category: 'ai', description: 'Name displayed for the AI agent in conversations' },
      { key: 'ai_agent_logo', value: '', category: 'ai', description: 'URL of the logo image for the AI agent' },
      { key: 'ai_system_message', value: 'You are a helpful AI assistant for NxChat customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.', category: 'ai', description: 'System message that defines AI behavior and personality' },
      
      // Payment Settings
      { key: 'stripe_secret_key', value: '', category: 'payment', description: 'Stripe secret key', is_encrypted: true },
      { key: 'stripe_publishable_key', value: '', category: 'payment', description: 'Stripe publishable key' },
      { key: 'stripe_webhook_secret', value: '', category: 'payment', description: 'Stripe webhook secret', is_encrypted: true },
      
      // Feature Flags
      { key: 'enable_ai_chatbot', value: 'true', category: 'features', description: 'Enable AI chatbot feature' },
      { key: 'enable_video_calls', value: 'true', category: 'features', description: 'Enable video calling feature' },
      { key: 'enable_file_sharing', value: 'true', category: 'features', description: 'Enable file sharing feature' },
      { key: 'enable_analytics', value: 'true', category: 'features', description: 'Enable analytics feature' },
      { key: 'enable_webhooks', value: 'false', category: 'features', description: 'Enable webhooks feature' }
    ];

    for (const setting of defaultSettings) {
      await SystemSetting.upsert({
        setting_key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        is_encrypted: setting.is_encrypted || false,
        updated_by: 1 // Super admin user ID
      });
    }

    console.log('✅ System settings seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding system settings:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedSystemSettings()
    .then(() => {
      console.log('🎉 System settings seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 System settings seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSystemSettings;
