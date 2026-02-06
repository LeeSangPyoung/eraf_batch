-- Add last_deploy_time column to track when agent was last deployed
-- This is used to reset agent health status after redeploy
ALTER TABLE scheduler_job_servers
ADD COLUMN last_deploy_time BIGINT;

-- Initialize with current timestamp for existing servers
UPDATE scheduler_job_servers
SET last_deploy_time = EXTRACT(EPOCH FROM NOW()) * 1000
WHERE last_deploy_time IS NULL;
