-- Remove secondary server columns (no longer needed)
-- Note: Job's secondary_system_id and tertiary_system_id are kept for job failover functionality
ALTER TABLE scheduler_job_servers DROP COLUMN IF EXISTS secondary_host_ip_addr;
ALTER TABLE scheduler_job_servers DROP COLUMN IF EXISTS secondary_folder_path;
