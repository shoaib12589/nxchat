-- Add unique index to prevent duplicate visitor activity entries
-- This ensures only one row per visitor (per tenant) in the visitor_activities table

-- First, remove any duplicate entries (keep the most recent one)
DELETE t1 FROM visitor_activities t1
INNER JOIN visitor_activities t2
WHERE t1.id > t2.id
  AND t1.visitor_id = t2.visitor_id
  AND t1.tenant_id = t2.tenant_id;

-- Add unique index on visitor_id and tenant_id
-- This prevents creating duplicate rows for the same visitor
ALTER TABLE visitor_activities
ADD UNIQUE INDEX idx_visitor_activities_unique_visitor (visitor_id, tenant_id);

