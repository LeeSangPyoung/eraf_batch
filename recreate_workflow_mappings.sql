-- Recreate workflow-job mappings so each workflow uses jobs from same server
-- Step 1: Delete existing workflow-job mappings
DELETE FROM scheduler_workflow_priority_group_jobs;
DELETE FROM scheduler_workflow_priority_group;

-- Step 2: Assign jobs to servers first (12-13 jobs per server)
DO $$
DECLARE
    worker2_id UUID;
    worker3_id UUID;
    worker4_id UUID;
    jar_worker_id UUID;
BEGIN
    SELECT system_id INTO worker2_id FROM scheduler_job_servers WHERE system_name = 'worker2';
    SELECT system_id INTO worker3_id FROM scheduler_job_servers WHERE system_name = 'worker3';
    SELECT system_id INTO worker4_id FROM scheduler_job_servers WHERE system_name = 'worker4';
    SELECT system_id INTO jar_worker_id FROM scheduler_job_servers WHERE system_name = 'jar_worker';

    -- Assign jobs 1-13 to worker2
    UPDATE scheduler_jobs SET system_id = worker2_id
    WHERE job_name IN (
        'test_job_1', 'test_job_2', 'test_job_3', 'test_job_4', 'test_job_5',
        'test_job_6', 'test_job_7', 'test_job_8', 'test_job_9', 'test_job_10',
        'test_job_11', 'test_job_12', 'test_job_13'
    );

    -- Assign jobs 14-26 to worker3
    UPDATE scheduler_jobs SET system_id = worker3_id
    WHERE job_name IN (
        'test_job_14', 'test_job_15', 'test_job_16', 'test_job_17', 'test_job_18',
        'test_job_19', 'test_job_20', 'test_job_21', 'test_job_22', 'test_job_23',
        'test_job_24', 'test_job_25', 'test_job_26'
    );

    -- Assign jobs 27-39 to worker4
    UPDATE scheduler_jobs SET system_id = worker4_id
    WHERE job_name IN (
        'test_job_27', 'test_job_28', 'test_job_29', 'test_job_30', 'test_job_31',
        'test_job_32', 'test_job_33', 'test_job_34', 'test_job_35', 'test_job_36',
        'test_job_37', 'test_job_38', 'test_job_39'
    );

    -- Assign jobs 40-50 to jar_worker
    UPDATE scheduler_jobs SET system_id = jar_worker_id
    WHERE job_name IN (
        'test_job_40', 'test_job_41', 'test_job_42', 'test_job_43', 'test_job_44',
        'test_job_45', 'test_job_46', 'test_job_47', 'test_job_48', 'test_job_49',
        'test_job_50'
    );

    RAISE NOTICE 'Reassigned all jobs to servers';
END $$;

-- Step 3: Create priority groups and job mappings for each workflow
DO $$
DECLARE
    v_workflow_id UUID;
    v_pg_id UUID;
    v_job_ids UUID[];
    i INT;
    workflow_names TEXT[] := ARRAY[
        'workflow_1', 'workflow_2', 'workflow_3', 'workflow_4', 'workflow_5',
        'workflow_6', 'workflow_7', 'workflow_8', 'workflow_9', 'workflow_10',
        'workflow_11', 'workflow_12', 'workflow_13', 'workflow_14', 'workflow_15',
        'workflow_16', 'workflow_17', 'workflow_18', 'workflow_19', 'workflow_20',
        'workflow_21', 'workflow_22', 'workflow_23', 'workflow_24', 'workflow_25',
        'workflow_26', 'workflow_27', 'workflow_28', 'workflow_29', 'workflow_30'
    ];
    server_name TEXT;
    num_priority_groups INT;
    num_jobs INT;
    job_idx INT;
BEGIN
    FOR i IN 1..30 LOOP
        SELECT id INTO v_workflow_id FROM scheduler_workflow WHERE workflow_name = workflow_names[i];

        -- Determine server based on workflow number
        IF i <= 8 THEN
            server_name := 'worker2';
        ELSIF i <= 15 THEN
            server_name := 'worker3';
        ELSIF i <= 22 THEN
            server_name := 'worker4';
        ELSE
            server_name := 'jar_worker';
        END IF;

        -- Get jobs for this server
        SELECT ARRAY_AGG(job_id ORDER BY RANDOM()) INTO v_job_ids
        FROM scheduler_jobs j
        JOIN scheduler_job_servers s ON j.system_id = s.system_id
        WHERE s.system_name = server_name AND j.job_name LIKE 'test_job_%';

        -- Create 1-3 priority groups
        num_priority_groups := 1 + (i % 3);
        job_idx := 1;

        FOR pg IN 1..num_priority_groups LOOP
            -- Create priority group
            v_pg_id := gen_random_uuid();
            INSERT INTO scheduler_workflow_priority_group (
                id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date, latest_status
            ) VALUES (
                v_pg_id, v_workflow_id, pg, FALSE,
                EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
                EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
                'WAITING'
            );

            -- Assign 2-5 jobs to this priority group
            num_jobs := 2 + ((i + pg) % 4);
            FOR j IN 1..LEAST(num_jobs, array_length(v_job_ids, 1) - job_idx + 1) LOOP
                IF job_idx <= array_length(v_job_ids, 1) THEN
                    INSERT INTO scheduler_workflow_priority_group_jobs (
                        priority_group_id, job_id
                    ) VALUES (
                        v_pg_id, v_job_ids[job_idx]
                    );
                    job_idx := job_idx + 1;
                END IF;
            END LOOP;
        END LOOP;

        RAISE NOTICE 'Created priority groups for % (server: %)', workflow_names[i], server_name;
    END LOOP;
END $$;

-- Verify the results
SELECT
    w.workflow_name,
    MAX(s.system_name) as server,
    COUNT(DISTINCT s.system_id) as unique_servers,
    COUNT(DISTINCT pg.id) as priority_groups,
    COUNT(DISTINCT j.job_id) as total_jobs
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
JOIN scheduler_job_servers s ON j.system_id = s.system_id
WHERE w.workflow_name LIKE 'workflow_%'
GROUP BY w.workflow_name
ORDER BY w.workflow_name;
