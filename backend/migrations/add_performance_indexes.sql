-- Performance Indexes for NxChat
-- Run this script to optimize database queries for pagination and real-time messaging

-- Indexes for visitor_messages table
CREATE INDEX IF NOT EXISTS idx_visitor_messages_visitor_id_created_at ON visitor_messages(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_tenant_id ON visitor_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_is_read ON visitor_messages(is_read);

-- Indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Indexes for chats table
CREATE INDEX IF NOT EXISTS idx_chats_tenant_id ON chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_chats_customer_id ON chats(customer_id);
CREATE INDEX IF NOT EXISTS idx_chats_started_at ON chats(started_at DESC);

-- Indexes for visitors table
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_id ON visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_brand_id ON visitors(brand_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Composite index for brand agents
CREATE INDEX IF NOT EXISTS idx_brand_agents_agent_brand ON brand_agents(agent_id, brand_id, status);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_chat_id ON tickets(chat_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

