-- Add file fields to visitor_messages table
ALTER TABLE visitor_messages 
ADD COLUMN file_url VARCHAR(500) NULL AFTER message_type,
ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url,
ADD COLUMN file_size INT NULL AFTER file_name;

