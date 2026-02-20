-- Add repeat intervals to jobs
UPDATE scheduler_jobs SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=2',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE job_name = 'job_workflow_1';

UPDATE scheduler_jobs SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=3',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE job_name = 'job_workflow_2';

UPDATE scheduler_jobs SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=4',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE job_name = 'job_workflow_3';

UPDATE scheduler_jobs SET
    repeat_interval = 'FREQ=HOURLY;INTERVAL=2',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE job_name = 'job_workflow_4';

UPDATE scheduler_jobs SET
    repeat_interval = 'FREQ=DAILY;INTERVAL=2',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE job_name = 'job_workflow_5';

SELECT job_name, repeat_interval FROM scheduler_jobs ORDER BY job_name;
