-- Add 'waiting_for_agent' status to visitors table
-- This status indicates that a chat has been transferred to an agent but the agent hasn't joined yet

ALTER TABLE `visitors` MODIFY COLUMN `status` ENUM('online', 'away', 'offline', 'idle', 'waiting_for_agent') NOT NULL DEFAULT 'idle';

