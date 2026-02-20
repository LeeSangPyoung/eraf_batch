-- Fix workflow jobs to use the same server per workflow
-- Each workflow's jobs must be on the same server (same queue) to execute

-- Get server IDs
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

    -- Assign workflows 1-8 to worker2
    UPDATE scheduler_jobs
    SET system_id = worker2_id
    WHERE job_id IN (
        SELECT DISTINCT j.job_id
        FROM scheduler_jobs j
        JOIN scheduler_workflow_priority_group_jobs pgj ON j.job_id = pgj.job_id
        JOIN scheduler_workflow_priority_group pg ON pgj.priority_group_id = pg.id
        JOIN scheduler_workflow w ON pg.workflow_id = w.id
        WHERE w.workflow_name IN ('workflow_1', 'workflow_2', 'workflow_3', 'workflow_4',
                                  'workflow_5', 'workflow_6', 'workflow_7', 'workflow_8')
    );

    -- Assign workflows 9-16 to worker3
    UPDATE scheduler_jobs
    SET system_id = worker3_id
    WHERE job_id IN (
        SELECT DISTINCT j.job_id
        FROM scheduler_jobs j
        JOIN scheduler_workflow_priority_group_jobs pgj ON j.job_id = pgj.job_id
        JOIN scheduler_workflow_priority_group pg ON pgj.priority_group_id = pg.id
        JOIN scheduler_workflow w ON pg.workflow_id = w.id
        WHERE w.workflow_name IN ('workflow_9', 'workflow_10', 'workflow_11', 'workflow_12',
                                  'workflow_13', 'workflow_14', 'workflow_15', 'workflow_16')
    );

    -- Assign workflows 17-24 to worker4
    UPDATE scheduler_jobs
    SET system_id = worker4_id
    WHERE job_id IN (
        SELECT DISTINCT j.job_id
        FROM scheduler_jobs j
        JOIN scheduler_workflow_priority_group_jobs pgj ON j.job_id = pgj.job_id
        JOIN scheduler_workflow_priority_group pg ON pgj.priority_group_id = pg.id
        JOIN scheduler_workflow w ON pg.workflow_id = w.id
        WHERE w.workflow_name IN ('workflow_17', 'workflow_18', 'workflow_19', 'workflow_20',
                                  'workflow_21', 'workflow_22', 'workflow_23', 'workflow_24')
    );

    -- Assign workflows 25-30 to jar_worker
    UPDATE scheduler_jobs
    SET system_id = jar_worker_id
    WHERE job_id IN (
        SELECT DISTINCT j.job_id
        FROM scheduler_jobs j
        JOIN scheduler_workflow_priority_group_jobs pgj ON j.job_id = pgj.job_id
        JOIN scheduler_workflow_priority_group pg ON pgj.priority_group_id = pg.id
        JOIN scheduler_workflow w ON pg.workflow_id = w.id
        WHERE w.workflow_name IN ('workflow_25', 'workflow_26', 'workflow_27', 'workflow_28',
                                  'workflow_29', 'workflow_30')
    );

    RAISE NOTICE 'Updated workflow job server assignments';
END $$;

-- Verify the fix
SELECT
    w.workflow_name,
    COUNT(DISTINCT j.system_id) as unique_servers,
    MAX(s.system_name) as server_name
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
LEFT JOIN scheduler_job_servers s ON j.system_id = s.system_id
WHERE w.workflow_name LIKE 'workflow_%'
GROUP BY w.workflow_name
ORDER BY w.workflow_name;
