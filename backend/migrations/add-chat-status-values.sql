-- Add new chat status values for better tracking
ALTER TABLE `chats` MODIFY COLUMN `status` ENUM('waiting', 'active', 'closed', 'transferred', 'completed', 'visitor_left') NOT NULL DEFAULT 'waiting';

