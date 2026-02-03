-- Add secondary and tertiary server columns for failover support
-- Primary server: system_id (existing)
-- Secondary server: secondary_system_id (new)
-- Tertiary server: tertiary_system_id (new)

ALTER TABLE scheduler_jobs ADD COLUMN IF NOT EXISTS secondary_system_id VARCHAR(36);
ALTER TABLE scheduler_jobs ADD COLUMN IF NOT EXISTS tertiary_system_id VARCHAR(36);

-- Add foreign key constraints (optional, uncomment if needed)
-- ALTER TABLE scheduler_jobs ADD CONSTRAINT fk_job_secondary_server FOREIGN KEY (secondary_system_id) REFERENCES scheduler_servers(system_id);
-- ALTER TABLE scheduler_jobs ADD CONSTRAINT fk_job_tertiary_server FOREIGN KEY (tertiary_system_id) REFERENCES scheduler_servers(system_id);

COMMENT ON COLUMN scheduler_jobs.secondary_system_id IS 'Secondary server for failover when primary is offline/unhealthy';
COMMENT ON COLUMN scheduler_jobs.tertiary_system_id IS 'Tertiary server for failover when primary and secondary are offline/unhealthy';
