-- Update existing test jobs with MINUTELY intervals and specific start times
DO $$
DECLARE
    v_job RECORD;
    v_random_hour INTEGER;
    v_random_minute INTEGER;
    v_random_second INTEGER;
    v_start_time TIMESTAMP;
    v_start_epoch BIGINT;
    i INTEGER := 1;
BEGIN
    FOR v_job IN (
        SELECT job_id, job_name
        FROM scheduler_jobs
        WHERE job_name LIKE 'test_job_%'
        ORDER BY job_name
    ) LOOP
        -- Generate random time: between 00:00:00 and 23:59:59
        v_random_hour := floor(random() * 24)::INTEGER;
        v_random_minute := floor(random() * 60)::INTEGER;
        v_random_second := floor(random() * 60)::INTEGER;

        -- Create timestamp for today with random time
        v_start_time := date_trunc('day', NOW()) +
                       (v_random_hour || ' hours')::INTERVAL +
                       (v_random_minute || ' minutes')::INTERVAL +
                       (v_random_second || ' seconds')::INTERVAL;

        v_start_epoch := EXTRACT(EPOCH FROM v_start_time) * 1000;

        -- Update job with MINUTELY intervals (80% of jobs)
        UPDATE scheduler_jobs
        SET
            start_date = v_start_epoch,
            repeat_interval = CASE
                WHEN i % 20 = 0 THEN 'FREQ=HOURLY;INTERVAL=1'
                WHEN i % 19 = 0 THEN 'FREQ=DAILY;INTERVAL=1'
                WHEN i % 18 = 0 THEN NULL  -- Manual only
                WHEN i % 7 = 0 THEN 'FREQ=MINUTELY;INTERVAL=1'
                WHEN i % 6 = 0 THEN 'FREQ=MINUTELY;INTERVAL=2'
                WHEN i % 5 = 0 THEN 'FREQ=MINUTELY;INTERVAL=5'
                WHEN i % 4 = 0 THEN 'FREQ=MINUTELY;INTERVAL=10'
                WHEN i % 3 = 0 THEN 'FREQ=MINUTELY;INTERVAL=15'
                WHEN i % 2 = 0 THEN 'FREQ=MINUTELY;INTERVAL=30'
                ELSE 'FREQ=MINUTELY;INTERVAL=3'
            END,
            next_run_date = v_start_epoch
        WHERE job_id = v_job.job_id;

        i := i + 1;
    END LOOP;

    RAISE NOTICE 'Updated % jobs with MINUTELY intervals and specific start times', i-1;

    -- Update workflows with MINUTELY intervals
    i := 1;
    FOR v_job IN (
        SELECT id, workflow_name
        FROM scheduler_workflow
        WHERE workflow_name LIKE 'workflow_%'
        ORDER BY workflow_name
    ) LOOP
        v_random_hour := floor(random() * 24)::INTEGER;
        v_random_minute := floor(random() * 60)::INTEGER;
        v_random_second := floor(random() * 60)::INTEGER;

        v_start_time := date_trunc('day', NOW()) +
                       (v_random_hour || ' hours')::INTERVAL +
                       (v_random_minute || ' minutes')::INTERVAL +
                       (v_random_second || ' seconds')::INTERVAL;

        v_start_epoch := EXTRACT(EPOCH FROM v_start_time) * 1000;

        UPDATE scheduler_workflow
        SET
            start_date = v_start_epoch,
            repeat_interval = CASE
                WHEN i % 15 = 0 THEN 'FREQ=HOURLY;INTERVAL=1'
                WHEN i % 14 = 0 THEN 'FREQ=HOURLY;INTERVAL=2'
                WHEN i % 13 = 0 THEN 'FREQ=DAILY;INTERVAL=1'
                WHEN i % 10 = 0 THEN 'FREQ=MINUTELY;INTERVAL=5'
                WHEN i % 9 = 0 THEN 'FREQ=MINUTELY;INTERVAL=10'
                WHEN i % 8 = 0 THEN 'FREQ=MINUTELY;INTERVAL=15'
                WHEN i % 7 = 0 THEN 'FREQ=MINUTELY;INTERVAL=20'
                WHEN i % 6 = 0 THEN 'FREQ=MINUTELY;INTERVAL=30'
                WHEN i % 5 = 0 THEN 'FREQ=MINUTELY;INTERVAL=45'
                WHEN i % 4 = 0 THEN 'FREQ=MINUTELY;INTERVAL=2'
                WHEN i % 3 = 0 THEN 'FREQ=MINUTELY;INTERVAL=3'
                ELSE 'FREQ=MINUTELY;INTERVAL=1'
            END,
            next_run_date = v_start_epoch
        WHERE id = v_job.id;

        i := i + 1;
    END LOOP;

    RAISE NOTICE 'Updated % workflows with MINUTELY intervals and specific start times', i-1;
END $$;
