-- Performance indexes for frequently queried columns

-- Job run logs: queried by system_id for agent failure stats
CREATE INDEX IF NOT EXISTS idx_job_run_logs_system_id ON scheduler_job_run_logs(system_id);

-- Job run logs: queried by status for failure counts and health checks
CREATE INDEX IF NOT EXISTS idx_job_run_logs_status ON scheduler_job_run_logs(status);

-- Job run logs: composite index for job+status queries (marking jobs as BROKEN)
CREATE INDEX IF NOT EXISTS idx_job_run_logs_job_status ON scheduler_job_run_logs(job_id, status);

-- Job run logs: composite index for time-based queries
CREATE INDEX IF NOT EXISTS idx_job_run_logs_start_time ON scheduler_job_run_logs(start_time DESC);

-- Jobs: queried for enabled jobs with schedule on startup
CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON scheduler_jobs(is_enabled);

-- Users: queried by user_id for login
CREATE INDEX IF NOT EXISTS idx_users_user_id ON scheduler_users(user_id);

-- Workflow runs: queried by status for cleanup
CREATE INDEX IF NOT EXISTS idx_workflow_run_status ON scheduler_workflow_run(status);

-- Workflow runs: queried by workflow_id
CREATE INDEX IF NOT EXISTS idx_workflow_run_workflow_id ON scheduler_workflow_run(workflow_id);
