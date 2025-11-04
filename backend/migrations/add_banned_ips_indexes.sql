-- Performance indexes for banned_ips table
-- Run this script to optimize banned IP queries

-- Index for tenant_id and is_active (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_banned_ips_tenant_active ON banned_ips(tenant_id, is_active);

-- Index for ip_address lookup (for specific IP checks)
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip_tenant ON banned_ips(ip_address, tenant_id, is_active);

-- Index for tenant_id and created_at (for listing banned IPs)
CREATE INDEX IF NOT EXISTS idx_banned_ips_tenant_created ON banned_ips(tenant_id, created_at DESC);

-- Composite index for active bans per tenant
CREATE INDEX IF NOT EXISTS idx_banned_ips_tenant_active_created ON banned_ips(tenant_id, is_active, created_at DESC);

