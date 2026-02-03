-- V7: Add user_name column to scheduler_job_run_logs table
-- This column tracks which user executed the job (for manual runs)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'scheduler_job_run_logs' AND column_name = 'user_name') THEN
        ALTER TABLE scheduler_job_run_logs ADD COLUMN user_name VARCHAR(100);
    END IF;
END $$;
