-- Migration: Create brands table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `logo` varchar(500) DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#007bff',
  `secondary_color` varchar(7) DEFAULT '#6c757d',
  `tenant_id` int(11) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `settings` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_name_tenant_unique` (`name`,`tenant_id`),
  KEY `brands_tenant_id` (`tenant_id`),
  KEY `brands_status` (`status`),
  CONSTRAINT `brands_tenant_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Create brand_agents junction table
CREATE TABLE IF NOT EXISTS `brand_agents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `brand_id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int(11) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `brand_agents_brand_agent_unique` (`brand_id`,`agent_id`),
  KEY `brand_agents_brand_id` (`brand_id`),
  KEY `brand_agents_agent_id` (`agent_id`),
  KEY `brand_agents_status` (`status`),
  CONSTRAINT `brand_agents_brand_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_agents_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_agents_assigned_by_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Add brand_id to widget_keys table
ALTER TABLE `widget_keys` 
ADD COLUMN `brand_id` int(11) DEFAULT NULL AFTER `tenant_id`,
ADD KEY `widget_keys_brand_id` (`brand_id`),
ADD CONSTRAINT `widget_keys_brand_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL;

-- Migration: Add brand_id to visitors table
ALTER TABLE `visitors` 
ADD COLUMN `brand_id` int(11) DEFAULT NULL AFTER `tenant_id`,
ADD KEY `visitors_brand_id` (`brand_id`),
ADD CONSTRAINT `visitors_brand_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL;
