-- Add job_headers column to scheduler_jobs table
-- Stores HTTP headers as JSON for REST_API type jobs

ALTER TABLE scheduler_jobs
ADD COLUMN IF NOT EXISTS job_headers TEXT;

COMMENT ON COLUMN scheduler_jobs.job_headers IS 'HTTP headers for REST_API jobs (JSON format)';
