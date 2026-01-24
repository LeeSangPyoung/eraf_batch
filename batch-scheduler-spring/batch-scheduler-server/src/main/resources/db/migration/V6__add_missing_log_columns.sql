-- V6: Add missing columns to scheduler_job_run_logs table
-- These columns were defined in V4 but not actually applied to the database

-- Use IF NOT EXISTS to handle cases where some columns may already exist
DO $$
BEGIN
    -- job_name: denormalized job name at execution time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'job_name') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN job_name VARCHAR(200);
    END IF;

    -- batch_type: auto/manual execution type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'batch_type') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN batch_type VARCHAR(20) DEFAULT 'Auto';
    END IF;

    -- operation: job operation type (RUN, COMPLETED, BROKEN, REVOKED)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'operation') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN operation VARCHAR(50);
    END IF;

    -- system_id and system_name: server info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'system_id') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN system_id VARCHAR(36);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'system_name') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN system_name VARCHAR(100);
    END IF;

    -- group_id and group_name: group info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'group_id') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN group_id VARCHAR(36);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'group_name') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN group_name VARCHAR(100);
    END IF;

    -- error_no: error code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'error_no') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN error_no INTEGER;
    END IF;

    -- workflow support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'workflow_run_id') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN workflow_run_id BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'workflow_priority') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN workflow_priority INTEGER;
    END IF;
END $$;

-- Create indexes for filtering (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_job_run_logs_operation ON scheduler_job_run_logs(operation);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_batch_type ON scheduler_job_run_logs(batch_type);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_group_id ON scheduler_job_run_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_system_id ON scheduler_job_run_logs(system_id);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_workflow_run_id ON scheduler_job_run_logs(workflow_run_id);
