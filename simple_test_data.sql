-- Simple test data: 5 workflows with 1-3 jobs each
DO $$
DECLARE
    worker2_id VARCHAR(36);
    default_group_id VARCHAR(36);
    ts BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;

    -- Job IDs
    job1_id VARCHAR(36) := gen_random_uuid()::text;
    job2_id VARCHAR(36) := gen_random_uuid()::text;
    job3_id VARCHAR(36) := gen_random_uuid()::text;
    job4_id VARCHAR(36) := gen_random_uuid()::text;
    job5_id VARCHAR(36) := gen_random_uuid()::text;

    -- Workflow IDs
    wf1_id VARCHAR(36) := gen_random_uuid()::text;
    wf2_id VARCHAR(36) := gen_random_uuid()::text;
    wf3_id VARCHAR(36) := gen_random_uuid()::text;
    wf4_id VARCHAR(36) := gen_random_uuid()::text;
    wf5_id VARCHAR(36) := gen_random_uuid()::text;

    -- Priority Group IDs
    pg1_id VARCHAR(36) := gen_random_uuid()::text;
    pg2_id VARCHAR(36) := gen_random_uuid()::text;
    pg3_id VARCHAR(36) := gen_random_uuid()::text;
    pg4_id VARCHAR(36) := gen_random_uuid()::text;
    pg5_id VARCHAR(36) := gen_random_uuid()::text;
BEGIN
    -- Get worker2 ID
    SELECT system_id INTO worker2_id FROM scheduler_job_servers WHERE system_name = 'worker2';
    SELECT group_id INTO default_group_id FROM scheduler_job_groups WHERE group_name = 'Default' LIMIT 1;

    -- Create 5 jobs (all on worker2)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, frst_reg_date, last_chg_date)
    VALUES
    (job1_id, 'job_1', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job 1 executed"', true, 'SCHEDULED', ts, ts),
    (job2_id, 'job_2', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job 2 executed"', true, 'SCHEDULED', ts, ts),
    (job3_id, 'job_3', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job 3 executed"', true, 'SCHEDULED', ts, ts),
    (job4_id, 'job_4', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job 4 executed"', true, 'SCHEDULED', ts, ts),
    (job5_id, 'job_5', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job 5 executed"', true, 'SCHEDULED', ts, ts);

    -- Create 5 workflows
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, start_date, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES
    (wf1_id, 'workflow_1', default_group_id, 'WAITING', ts, NULL, 'Asia/Seoul', ts, ts),
    (wf2_id, 'workflow_2', default_group_id, 'WAITING', ts, NULL, 'Asia/Seoul', ts, ts),
    (wf3_id, 'workflow_3', default_group_id, 'WAITING', ts, NULL, 'Asia/Seoul', ts, ts),
    (wf4_id, 'workflow_4', default_group_id, 'WAITING', ts, NULL, 'Asia/Seoul', ts, ts),
    (wf5_id, 'workflow_5', default_group_id, 'WAITING', ts, NULL, 'Asia/Seoul', ts, ts);

    -- Create priority groups (1 per workflow)
    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, latest_status, frst_reg_date, last_chg_date)
    VALUES
    (pg1_id, wf1_id, 1, false, 'WAITING', ts, ts),
    (pg2_id, wf2_id, 1, false, 'WAITING', ts, ts),
    (pg3_id, wf3_id, 1, false, 'WAITING', ts, ts),
    (pg4_id, wf4_id, 1, false, 'WAITING', ts, ts),
    (pg5_id, wf5_id, 1, false, 'WAITING', ts, ts);

    -- Assign jobs to workflows
    -- workflow_1: job_1 (1 job)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES (pg1_id, job1_id);

    -- workflow_2: job_2, job_3 (2 jobs)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES (pg2_id, job2_id), (pg2_id, job3_id);

    -- workflow_3: job_4, job_5 (2 jobs)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES (pg3_id, job4_id), (pg3_id, job5_id);

    -- workflow_4: job_1, job_2, job_3 (3 jobs)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES (pg4_id, job1_id), (pg4_id, job2_id), (pg4_id, job3_id);

    -- workflow_5: job_3, job_4 (2 jobs)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES (pg5_id, job3_id), (pg5_id, job4_id);

    RAISE NOTICE 'Created 5 jobs, 5 workflows with job assignments';
END $$;

-- Verify
SELECT
    w.workflow_name,
    COUNT(DISTINCT j.job_id) as job_count,
    STRING_AGG(j.job_name, ', ' ORDER BY j.job_name) as jobs
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
GROUP BY w.workflow_name
ORDER BY w.workflow_name;
