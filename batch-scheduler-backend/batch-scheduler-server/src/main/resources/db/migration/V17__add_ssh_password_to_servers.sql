-- =============================================
-- Add SSH password authentication support
-- =============================================

-- Add ssh_password column for password-based SSH authentication
ALTER TABLE scheduler_job_servers
ADD COLUMN ssh_password VARCHAR(255);

-- Note: ssh_password will be encrypted before storage
-- NULL value means SSH key-based authentication will be used
