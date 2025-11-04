-- Comprehensive Optimization for Visitor Tables
-- This script optimizes visitors, visitor_activities, and visitor_messages tables
-- Run this script to dramatically improve query performance

-- ============================================
-- VISITORS TABLE OPTIMIZATION
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_status_active ON visitors(tenant_id, status, is_active, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_brand_status ON visitors(tenant_id, brand_id, status, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_agent_status ON visitors(assigned_agent_id, status, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_ip_tenant ON visitors(ip_address, tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_created_active ON visitors(created_at DESC, is_active);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_created ON visitors(tenant_id, created_at DESC);

-- Index for filtering active visitors by tenant
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_active_activity ON visitors(tenant_id, is_active, last_activity DESC);

-- Index for source tracking queries
CREATE INDEX IF NOT EXISTS idx_visitors_source_tenant ON visitors(source, tenant_id, created_at DESC);

-- ============================================
-- VISITOR_ACTIVITIES TABLE OPTIMIZATION
-- ============================================

-- Composite indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_visitor_activities_visitor_timestamp ON visitor_activities(visitor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_activities_tenant_timestamp ON visitor_activities(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_activities_session_timestamp ON visitor_activities(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_activities_type_timestamp ON visitor_activities(activity_type, timestamp DESC);

-- Composite index for tenant activity analysis
CREATE INDEX IF NOT EXISTS idx_visitor_activities_tenant_type_timestamp ON visitor_activities(tenant_id, activity_type, timestamp DESC);

-- Index for visitor activity history
CREATE INDEX IF NOT EXISTS idx_visitor_activities_visitor_tenant_timestamp ON visitor_activities(visitor_id, tenant_id, timestamp DESC);

-- ============================================
-- VISITOR_MESSAGES TABLE OPTIMIZATION
-- ============================================

-- Enhanced composite indexes for message queries
CREATE INDEX IF NOT EXISTS idx_visitor_messages_visitor_created_read ON visitor_messages(visitor_id, created_at DESC, is_read);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_tenant_created ON visitor_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_sender_created ON visitor_messages(sender_type, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_messages_tenant_read ON visitor_messages(tenant_id, is_read, created_at DESC);

-- Composite index for unread message queries (MySQL doesn't support WHERE clause in indexes)
-- Note: For unread queries, use idx_visitor_messages_visitor_created_read with WHERE is_read = 0 in queries
CREATE INDEX IF NOT EXISTS idx_visitor_messages_visitor_unread ON visitor_messages(visitor_id, is_read, created_at DESC);

-- Index for message type filtering
CREATE INDEX IF NOT EXISTS idx_visitor_messages_type_created ON visitor_messages(message_type, created_at DESC);

-- ============================================
-- TABLE OPTIMIZATION
-- ============================================

-- Optimize table structures
OPTIMIZE TABLE visitors;
OPTIMIZE TABLE visitor_activities;
OPTIMIZE TABLE visitor_messages;

-- Analyze tables to update statistics
ANALYZE TABLE visitors;
ANALYZE TABLE visitor_activities;
ANALYZE TABLE visitor_messages;

