-- Add missing columns to scheduler_job_run_logs (matching Python original schema)
-- These columns exist in the Python original but were missing in Spring migration

-- batch_type: auto/manual execution type
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS batch_type VARCHAR(20) DEFAULT 'Auto';

-- operation: job operation type (RUN, COMPLETED, FAILED, etc.)
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS operation VARCHAR(50);

-- job_name: denormalized job name at execution time
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS job_name VARCHAR(200);

-- system_id and system_name: server info
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS system_id VARCHAR(36);

ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS system_name VARCHAR(100);

-- group_id and group_name: group info
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS group_id VARCHAR(36);

ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS group_name VARCHAR(100);

-- error_no: error code
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS error_no INTEGER;

-- workflow support
ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS workflow_run_id BIGINT;

ALTER TABLE scheduler_job_run_logs
ADD COLUMN IF NOT EXISTS workflow_priority INTEGER;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_job_run_logs_operation ON scheduler_job_run_logs(operation);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_batch_type ON scheduler_job_run_logs(batch_type);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_group_id ON scheduler_job_run_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_system_id ON scheduler_job_run_logs(system_id);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_workflow_run_id ON scheduler_job_run_logs(workflow_run_id);
