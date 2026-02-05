-- =============================================
-- Add deployment_type column to job_servers
-- =============================================

-- Add deployment_type column (JAR or DOCKER)
ALTER TABLE scheduler_job_servers
ADD COLUMN deployment_type VARCHAR(10) DEFAULT 'JAR' NOT NULL;

-- Update existing servers to use JAR deployment (backward compatibility)
UPDATE scheduler_job_servers
SET deployment_type = 'JAR'
WHERE deployment_type IS NULL;
