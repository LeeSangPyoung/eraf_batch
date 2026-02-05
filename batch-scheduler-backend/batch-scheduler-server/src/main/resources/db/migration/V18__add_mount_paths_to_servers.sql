-- Add mount_paths column to scheduler_job_servers for Docker deployment
-- Stores comma-separated list of host paths to mount into the agent container
-- Example: /workspace,/home/tangosvc/scripts,/opt/batch-jobs

ALTER TABLE scheduler_job_servers
ADD COLUMN IF NOT EXISTS mount_paths VARCHAR(1000);

COMMENT ON COLUMN scheduler_job_servers.mount_paths IS 'Comma-separated list of host paths to mount into Docker container (Docker deployment only)';
