-- Performance optimization indexes for NxChat
-- Run this script to add essential indexes for better query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan_id ON companies(plan_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);

-- Chats table indexes
CREATE INDEX IF NOT EXISTS idx_chats_tenant_id ON chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chats_customer_id ON chats(customer_id);
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
CREATE INDEX IF NOT EXISTS idx_chats_tenant_status ON chats(tenant_id, status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);

-- Visitors table indexes
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_id ON visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_last_activity ON visitors(last_activity);
CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_status ON visitors(tenant_id, status);

-- Visitor messages table indexes
CREATE INDEX IF NOT EXISTS idx_visitor_messages_visitor_id ON visitor_messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_tenant_id ON visitor_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_created_at ON visitor_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_visitor_created ON visitor_messages(visitor_id, created_at);

-- Widget keys table indexes
CREATE INDEX IF NOT EXISTS idx_widget_keys_tenant_id ON widget_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widget_keys_key ON widget_keys(key);
CREATE INDEX IF NOT EXISTS idx_widget_keys_is_active ON widget_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_widget_keys_tenant_active ON widget_keys(tenant_id, is_active);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- AI training docs table indexes
CREATE INDEX IF NOT EXISTS idx_ai_training_docs_tenant_id ON ai_training_docs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_docs_type ON ai_training_docs(type);
CREATE INDEX IF NOT EXISTS idx_ai_training_docs_status ON ai_training_docs(status);

-- Tickets table indexes
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- Triggers table indexes
CREATE INDEX IF NOT EXISTS idx_triggers_tenant_id ON triggers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_triggers_tenant_active ON triggers(tenant_id, is_active);

-- Call sessions table indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_chat_id ON call_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON call_sessions(started_at);

-- Agent settings table indexes
CREATE INDEX IF NOT EXISTS idx_agent_settings_user_id ON agent_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_settings_tenant_id ON agent_settings(tenant_id);

-- Widget settings table indexes
CREATE INDEX IF NOT EXISTS idx_widget_settings_tenant_id ON widget_settings(tenant_id);

-- System settings table indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_setting_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Storage providers table indexes
CREATE INDEX IF NOT EXISTS idx_storage_providers_tenant_id ON storage_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_providers_is_active ON storage_providers(is_active);

-- Visitor activities table indexes
CREATE INDEX IF NOT EXISTS idx_visitor_activities_visitor_id ON visitor_activities(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_activities_tenant_id ON visitor_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_activities_created_at ON visitor_activities(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_chats_tenant_status_created ON chats(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_sender ON messages(chat_id, created_at, sender_type);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_status_activity ON visitors(tenant_id, status, last_activity);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role_status ON users(tenant_id, role, status);

-- Full-text search indexes (if needed)
-- CREATE FULLTEXT INDEX idx_messages_content ON messages(message);
-- CREATE FULLTEXT INDEX idx_tickets_subject_content ON tickets(subject, description);

-- Analyze tables for query optimization
ANALYZE TABLE users;
ANALYZE TABLE companies;
ANALYZE TABLE chats;
ANALYZE TABLE messages;
ANALYZE TABLE visitors;
ANALYZE TABLE visitor_messages;
ANALYZE TABLE widget_keys;
ANALYZE TABLE notifications;
ANALYZE TABLE ai_training_docs;
ANALYZE TABLE tickets;
ANALYZE TABLE triggers;
ANALYZE TABLE call_sessions;
ANALYZE TABLE agent_settings;
ANALYZE TABLE widget_settings;
ANALYZE TABLE system_settings;
ANALYZE TABLE storage_providers;
ANALYZE TABLE visitor_activities;

-- Show index usage statistics
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SUB_PART,
    PACKED,
    NULLABLE,
    INDEX_TYPE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'nxchat' 
ORDER BY TABLE_NAME, INDEX_NAME;
