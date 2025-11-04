-- Add max_brands column to plans table
ALTER TABLE `plans` 
ADD COLUMN `max_brands` INT NOT NULL DEFAULT 1 AFTER `max_departments`;

-- Update existing plans with a default value (if needed, adjust based on plan tier)
UPDATE `plans` SET `max_brands` = 1 WHERE `max_brands` IS NULL OR `max_brands` = 0;

