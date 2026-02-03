-- Add agent_port column to scheduler_job_servers table
ALTER TABLE scheduler_job_servers ADD COLUMN IF NOT EXISTS agent_port INTEGER DEFAULT 8081;

-- Update existing records with unique ports based on queue_name
UPDATE scheduler_job_servers
SET agent_port = 8081 + (ABS(HASHTEXT(COALESCE(queue_name, system_id))) % 919)
WHERE agent_port IS NULL OR agent_port = 8081;
