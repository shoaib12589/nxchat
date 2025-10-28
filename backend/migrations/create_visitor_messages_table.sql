-- Migration script to create visitor_messages table
-- Run this in your MySQL database

CREATE TABLE IF NOT EXISTS `visitor_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitor_id` varchar(36) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `sender_type` enum('visitor','agent','ai','system') NOT NULL DEFAULT 'visitor',
  `sender_id` int(11) DEFAULT NULL,
  `sender_name` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `message_type` enum('text','image','file','system','ai_suggestion') NOT NULL DEFAULT 'text',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_sender_type` (`sender_type`),
  KEY `fk_visitor_messages_visitor` (`visitor_id`),
  KEY `fk_visitor_messages_tenant` (`tenant_id`),
  KEY `fk_visitor_messages_sender` (`sender_id`),
  CONSTRAINT `fk_visitor_messages_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `visitors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visitor_messages_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visitor_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
