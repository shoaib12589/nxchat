-- Migration script to create banned_ips table
-- Run this in your MySQL database

CREATE TABLE IF NOT EXISTS `banned_ips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `banned_by` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ip_address` (`ip_address`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `fk_banned_ips_tenant` (`tenant_id`),
  KEY `fk_banned_ips_banned_by` (`banned_by`),
  CONSTRAINT `fk_banned_ips_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_banned_ips_banned_by` FOREIGN KEY (`banned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

