-- Clean simple data: 5 workflows, each with its own unique jobs
DO $$
DECLARE
    worker2_id VARCHAR(36);
    default_group_id VARCHAR(36);
    ts BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;

    -- Workflow IDs
    wf1_id VARCHAR(36) := gen_random_uuid()::text;
    wf2_id VARCHAR(36) := gen_random_uuid()::text;
    wf3_id VARCHAR(36) := gen_random_uuid()::text;
    wf4_id VARCHAR(36) := gen_random_uuid()::text;
    wf5_id VARCHAR(36) := gen_random_uuid()::text;

    -- Job IDs
    job1_id VARCHAR(36) := gen_random_uuid()::text;
    job2_id VARCHAR(36) := gen_random_uuid()::text;
    job3_id VARCHAR(36) := gen_random_uuid()::text;
    job4_id VARCHAR(36) := gen_random_uuid()::text;
    job5_id VARCHAR(36) := gen_random_uuid()::text;

    -- Priority Group IDs
    pg1_id VARCHAR(36) := gen_random_uuid()::text;
    pg2_id VARCHAR(36) := gen_random_uuid()::text;
    pg3_id VARCHAR(36) := gen_random_uuid()::text;
    pg4_id VARCHAR(36) := gen_random_uuid()::text;
    pg5_id VARCHAR(36) := gen_random_uuid()::text;
BEGIN
    -- Get server and group
    SELECT system_id INTO worker2_id FROM scheduler_job_servers WHERE system_name = 'worker2';
    SELECT group_id INTO default_group_id FROM scheduler_job_groups WHERE group_name = 'Default' LIMIT 1;

    -- Clear existing data
    TRUNCATE scheduler_workflow_priority_group_jobs, scheduler_workflow_priority_group, scheduler_workflow, scheduler_jobs CASCADE;

    -- Create 5 jobs (each for one workflow)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, frst_reg_date, last_chg_date)
    VALUES
    (job1_id, 'job_workflow_1', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job for workflow 1"', true, 'SCHEDULED', ts, ts),
    (job2_id, 'job_workflow_2', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job for workflow 2"', true, 'SCHEDULED', ts, ts),
    (job3_id, 'job_workflow_3', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job for workflow 3"', true, 'SCHEDULED', ts, ts),
    (job4_id, 'job_workflow_4', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job for workflow 4"', true, 'SCHEDULED', ts, ts),
    (job5_id, 'job_workflow_5', worker2_id, default_group_id, 'EXECUTABLE', 'echo "Job for workflow 5"', true, 'SCHEDULED', ts, ts);

    -- Create 5 workflows
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, start_date, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES
    (wf1_id, 'workflow_1', default_group_id, 'WAITING', ts, 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', ts, ts),
    (wf2_id, 'workflow_2', default_group_id, 'WAITING', ts, 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', ts, ts),
    (wf3_id, 'workflow_3', default_group_id, 'WAITING', ts, 'FREQ=MINUTELY;INTERVAL=15', 'Asia/Seoul', ts, ts),
    (wf4_id, 'workflow_4', default_group_id, 'WAITING', ts, 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', ts, ts),
    (wf5_id, 'workflow_5', default_group_id, 'WAITING', ts, 'FREQ=DAILY;INTERVAL=1', 'Asia/Seoul', ts, ts);

    -- Create priority groups
    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, latest_status, frst_reg_date, last_chg_date)
    VALUES
    (pg1_id, wf1_id, 1, false, 'WAITING', ts, ts),
    (pg2_id, wf2_id, 1, false, 'WAITING', ts, ts),
    (pg3_id, wf3_id, 1, false, 'WAITING', ts, ts),
    (pg4_id, wf4_id, 1, false, 'WAITING', ts, ts),
    (pg5_id, wf5_id, 1, false, 'WAITING', ts, ts);

    -- Assign jobs to workflows (1:1 mapping)
    INSERT INTO scheduler_workflow_priority_group_jobs (priority_group_id, job_id)
    VALUES
    (pg1_id, job1_id),
    (pg2_id, job2_id),
    (pg3_id, job3_id),
    (pg4_id, job4_id),
    (pg5_id, job5_id);

    RAISE NOTICE 'Created 5 workflows with 5 jobs (1:1 mapping)';
END $$;

-- Verify
SELECT
    w.workflow_name,
    j.job_name
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
ORDER BY w.workflow_name;
