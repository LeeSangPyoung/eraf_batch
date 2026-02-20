-- Test Data Generation Script
-- Creates 50 jobs and 30 workflows with various configurations

-- Get server IDs
DO $$
DECLARE
    v_worker2_id VARCHAR(36);
    v_worker3_id VARCHAR(36);
    v_worker4_id VARCHAR(36);
    v_jar_worker_id VARCHAR(36);
    v_default_group_id VARCHAR(36);
    v_admin_user_id VARCHAR(36) := 'admin-uuid-0001-0001-000000000001';
    v_now BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
    v_job_id VARCHAR(36);
    v_workflow_id VARCHAR(36);
    v_pg_id VARCHAR(36);
    i INTEGER;
    j INTEGER;
BEGIN
    -- Get server IDs
    SELECT system_id INTO v_worker2_id FROM scheduler_job_servers WHERE system_name = 'worker2' LIMIT 1;
    SELECT system_id INTO v_worker3_id FROM scheduler_job_servers WHERE system_name = 'worker3' LIMIT 1;
    SELECT system_id INTO v_worker4_id FROM scheduler_job_servers WHERE system_name = 'worker4' LIMIT 1;
    SELECT system_id INTO v_jar_worker_id FROM scheduler_job_servers WHERE system_name = 'jar_worker' LIMIT 1;
    SELECT group_id INTO v_default_group_id FROM scheduler_job_groups WHERE group_name = 'Default' LIMIT 1;

    -- Create 50 Jobs
    FOR i IN 1..50 LOOP
        v_job_id := gen_random_uuid()::text;

        INSERT INTO scheduler_jobs (
            job_id, job_name, system_id, group_id, job_type, job_action,
            job_comments, start_date, repeat_interval, timezone,
            max_run, max_failure, max_run_duration, retry_delay, priority,
            is_enabled, current_state, frst_reg_date, last_chg_date,
            frst_reg_user_id, last_reg_user_id, run_count, failure_count,
            retry_count, auto_drop, restart_on_failure, restartable,
            ignore_result, run_forever
        ) VALUES (
            v_job_id,
            'test_job_' || i,
            CASE (i % 4)
                WHEN 0 THEN v_worker2_id
                WHEN 1 THEN v_worker3_id
                WHEN 2 THEN v_worker4_id
                ELSE v_jar_worker_id
            END,
            v_default_group_id,
            'EXECUTABLE',
            CASE (i % 5)
                WHEN 0 THEN '/workspace/svc/test_success.sh'
                WHEN 1 THEN '/workspace/svc/test_failure.sh'
                WHEN 2 THEN 'python3 /workspace/svc/data_process.py'
                WHEN 3 THEN '/workspace/svc/backup_job.sh'
                ELSE 'python3 /workspace/svc/report_gen.py'
            END,
            'Test job ' || i || ' for automated testing',
            v_now + (i * 60000),  -- Stagger start times
            CASE (i % 3)
                WHEN 0 THEN 'FREQ=HOURLY;INTERVAL=1'
                WHEN 1 THEN 'FREQ=DAILY;INTERVAL=1'
                ELSE NULL  -- Manual execution only
            END,
            'Asia/Seoul',
            CASE WHEN i % 7 = 0 THEN 3 ELSE NULL END,  -- Some jobs have max_run
            3,  -- max_failure
            CASE (i % 4)
                WHEN 0 THEN 300
                WHEN 1 THEN 600
                WHEN 2 THEN 1800
                ELSE 3600
            END,  -- max_run_duration
            30,  -- retry_delay
            (i % 10) + 1,  -- priority 1-10
            CASE WHEN i % 20 = 0 THEN false ELSE true END,  -- Disable some jobs
            'SCHEDULED',
            v_now,
            v_now,
            v_admin_user_id,
            v_admin_user_id,
            0, 0, 0,  -- run_count, failure_count, retry_count
            CASE WHEN i % 15 = 0 THEN true ELSE false END,  -- auto_drop
            CASE WHEN i % 5 = 0 THEN true ELSE false END,  -- restart_on_failure
            true,  -- restartable
            false,  -- ignore_result
            false  -- run_forever
        );
    END LOOP;

    RAISE NOTICE 'Created 50 jobs';

    -- Create 30 Workflows
    FOR i IN 1..30 LOOP
        v_workflow_id := gen_random_uuid()::text;

        INSERT INTO scheduler_workflow (
            id, workflow_name, group_id, latest_status,
            start_date, repeat_interval, timezone,
            next_run_date, is_enabled,
            frst_reg_date, last_chg_date
        ) VALUES (
            v_workflow_id,
            'workflow_' || i,
            v_default_group_id,
            'SUCCESS',
            v_now + (i * 120000),  -- Stagger start times
            CASE (i % 4)
                WHEN 0 THEN 'FREQ=MINUTELY;INTERVAL=30'
                WHEN 1 THEN 'FREQ=HOURLY;INTERVAL=2'
                WHEN 2 THEN 'FREQ=DAILY;INTERVAL=1'
                ELSE 'FREQ=HOURLY;INTERVAL=6'
            END,
            'Asia/Seoul',
            v_now + (i * 120000) + 3600000,  -- next_run_date
            CASE WHEN i % 10 = 0 THEN false ELSE true END,  -- Some disabled
            v_now,
            v_now
        );

        -- Create 1-3 priority groups per workflow
        FOR j IN 1..(1 + (i % 3)) LOOP
            v_pg_id := gen_random_uuid()::text;

            INSERT INTO scheduler_workflow_priority_group (
                id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date, latest_status
            ) VALUES (
                v_pg_id,
                v_workflow_id,
                j,
                false,
                v_now,
                v_now,
                'PENDING'
            );

            -- Add 2-5 jobs to each priority group
            INSERT INTO scheduler_workflow_priority_group_jobs (
                priority_group_id, job_id
            )
            SELECT
                v_pg_id,
                job_id
            FROM scheduler_jobs
            WHERE job_name LIKE 'test_job_%'
            ORDER BY RANDOM()
            LIMIT 2 + (i % 4);
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Created 30 workflows with priority groups and job mappings';
END $$;
