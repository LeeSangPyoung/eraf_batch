-- Update existing groups that have NULL user IDs with the first admin user
UPDATE scheduler_job_groups
SET frst_reg_user_id = (SELECT id FROM scheduler_users WHERE user_type = 0 LIMIT 1),
    last_reg_user_id = (SELECT id FROM scheduler_users WHERE user_type = 0 LIMIT 1)
WHERE frst_reg_user_id IS NULL;
