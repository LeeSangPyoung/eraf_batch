-- Add is_healthy column to track actual heartbeat status
-- agent_status = user-controlled (Start/Stop actions)
-- is_healthy = actual heartbeat check result
ALTER TABLE scheduler_job_servers ADD COLUMN IF NOT EXISTS is_healthy BOOLEAN DEFAULT false;

-- Initialize is_healthy based on current agent_status
UPDATE scheduler_job_servers SET is_healthy = (agent_status = 'ONLINE');
