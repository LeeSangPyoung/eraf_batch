-- Add missing columns to scheduler_workflow_run table
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS workflow_name VARCHAR(255);
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS start_date BIGINT;
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS end_date BIGINT;
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 0;
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS completed_jobs INTEGER DEFAULT 0;
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS failed_jobs INTEGER DEFAULT 0;
ALTER TABLE scheduler_workflow_run ADD COLUMN IF NOT EXISTS duration_ms BIGINT;

-- Migrate data from old columns to new columns if they exist
UPDATE scheduler_workflow_run SET start_date = start_time WHERE start_date IS NULL AND start_time IS NOT NULL;
UPDATE scheduler_workflow_run SET end_date = end_time WHERE end_date IS NULL AND end_time IS NOT NULL;

-- Drop old columns if they exist (optional, can be done later)
-- ALTER TABLE scheduler_workflow_run DROP COLUMN IF EXISTS start_time;
-- ALTER TABLE scheduler_workflow_run DROP COLUMN IF EXISTS end_time;
-- ALTER TABLE scheduler_workflow_run DROP COLUMN IF EXISTS frst_reg_date;
