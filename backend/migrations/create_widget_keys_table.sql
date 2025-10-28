-- Migration to create widget_keys table
CREATE TABLE IF NOT EXISTS widget_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id INT NOT NULL,
  key VARCHAR(36) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_key (key),
  INDEX idx_active (is_active)
);
