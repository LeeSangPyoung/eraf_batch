-- Add user ID columns to scheduler_job_groups table
ALTER TABLE scheduler_job_groups
ADD COLUMN IF NOT EXISTS frst_reg_user_id VARCHAR(36);

ALTER TABLE scheduler_job_groups
ADD COLUMN IF NOT EXISTS last_reg_user_id VARCHAR(36);
