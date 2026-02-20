-- Test Data Verification Script
-- Run this to verify all test data is properly created

-- 1. Check total jobs created
SELECT COUNT(*) as total_jobs
FROM scheduler_jobs
WHERE job_name LIKE 'test_job_%';
-- Expected: 50

-- 2. Check total workflows created
SELECT COUNT(*) as total_workflows
FROM scheduler_workflow
WHERE workflow_name LIKE 'workflow_%';
-- Expected: 30

-- 3. Check workflow-job mappings
SELECT COUNT(*) as total_job_mappings
FROM scheduler_workflow_priority_group_jobs pgj
JOIN scheduler_workflow_priority_group pg ON pgj.priority_group_id = pg.id
JOIN scheduler_workflow w ON pg.workflow_id = w.id
WHERE w.workflow_name LIKE 'workflow_%';
-- Expected: 208

-- 4. Show jobs per workflow (first 10)
SELECT
    w.workflow_name,
    COUNT(DISTINCT j.job_id) as job_count,
    STRING_AGG(DISTINCT j.job_name, ', ' ORDER BY j.job_name) as jobs
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
WHERE w.workflow_name LIKE 'workflow_%'
GROUP BY w.workflow_name
ORDER BY w.workflow_name
LIMIT 10;

-- 5. Check repeat intervals distribution
SELECT
    CASE
        WHEN repeat_interval LIKE 'FREQ=MINUTELY%' THEN 'MINUTELY'
        WHEN repeat_interval LIKE 'FREQ=HOURLY%' THEN 'HOURLY'
        WHEN repeat_interval LIKE 'FREQ=DAILY%' THEN 'DAILY'
        ELSE 'MANUAL/OTHER'
    END as interval_type,
    COUNT(*) as count
FROM scheduler_jobs
WHERE job_name LIKE 'test_job_%'
GROUP BY
    CASE
        WHEN repeat_interval LIKE 'FREQ=MINUTELY%' THEN 'MINUTELY'
        WHEN repeat_interval LIKE 'FREQ=HOURLY%' THEN 'HOURLY'
        WHEN repeat_interval LIKE 'FREQ=DAILY%' THEN 'DAILY'
        ELSE 'MANUAL/OTHER'
    END
ORDER BY count DESC;

-- 6. Check workflow repeat intervals
SELECT
    CASE
        WHEN repeat_interval LIKE 'FREQ=MINUTELY%' THEN 'MINUTELY'
        WHEN repeat_interval LIKE 'FREQ=HOURLY%' THEN 'HOURLY'
        WHEN repeat_interval LIKE 'FREQ=DAILY%' THEN 'DAILY'
        ELSE 'MANUAL/OTHER'
    END as interval_type,
    COUNT(*) as count
FROM scheduler_workflow
WHERE workflow_name LIKE 'workflow_%'
GROUP BY
    CASE
        WHEN repeat_interval LIKE 'FREQ=MINUTELY%' THEN 'MINUTELY'
        WHEN repeat_interval LIKE 'FREQ=HOURLY%' THEN 'HOURLY'
        WHEN repeat_interval LIKE 'FREQ=DAILY%' THEN 'DAILY'
        ELSE 'MANUAL/OTHER'
    END
ORDER BY count DESC;

-- 7. Show sample workflow structure (workflow_1 detail)
SELECT
    w.workflow_name,
    pg.priority,
    j.job_name,
    j.job_type,
    j.job_action
FROM scheduler_workflow w
JOIN scheduler_workflow_priority_group pg ON w.id = pg.workflow_id
JOIN scheduler_workflow_priority_group_jobs pgj ON pg.id = pgj.priority_group_id
JOIN scheduler_jobs j ON pgj.job_id = j.job_id
WHERE w.workflow_name = 'workflow_1'
ORDER BY pg.priority, j.job_name;
