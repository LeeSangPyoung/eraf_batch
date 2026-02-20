-- Add repeat intervals and start dates to workflows
UPDATE scheduler_workflow SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=5',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE workflow_name = 'workflow_1';

UPDATE scheduler_workflow SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=10',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE workflow_name = 'workflow_2';

UPDATE scheduler_workflow SET
    repeat_interval = 'FREQ=MINUTELY;INTERVAL=15',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE workflow_name = 'workflow_3';

UPDATE scheduler_workflow SET
    repeat_interval = 'FREQ=HOURLY;INTERVAL=1',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE workflow_name = 'workflow_4';

UPDATE scheduler_workflow SET
    repeat_interval = 'FREQ=DAILY;INTERVAL=1',
    start_date = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
WHERE workflow_name = 'workflow_5';

SELECT workflow_name, repeat_interval, latest_status FROM scheduler_workflow ORDER BY workflow_name;
