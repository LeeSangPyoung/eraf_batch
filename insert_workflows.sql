-- Insert 5 workflows with ~15 jobs mapped
DO $$
DECLARE
    ts BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
    grp_id VARCHAR := 'default-group-uuid-000000000001';
BEGIN
    -- Workflow 1: Data Pipeline (5 jobs in 3 priority groups)
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES ('workflow-uuid-0001', 'Data-Pipeline-Workflow', grp_id, 'IDLE', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', ts, ts);

    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date)
    VALUES
    ('pg-uuid-0001', 'workflow-uuid-0001', 1, false, ts, ts),
    ('pg-uuid-0002', 'workflow-uuid-0001', 2, false, ts, ts),
    ('pg-uuid-0003', 'workflow-uuid-0001', 3, true, ts, ts);

    -- Update jobs to belong to workflow
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0001', priority_group_id = 'pg-uuid-0001', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0005';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0001', priority_group_id = 'pg-uuid-0002', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0009';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0001', priority_group_id = 'pg-uuid-0002', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0027';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0001', priority_group_id = 'pg-uuid-0003', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0028';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0001', priority_group_id = 'pg-uuid-0003', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0007';

    -- Workflow 2: Monitoring Workflow (3 jobs in 2 priority groups)
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES ('workflow-uuid-0002', 'Monitoring-Workflow', grp_id, 'IDLE', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', ts, ts);

    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date)
    VALUES
    ('pg-uuid-0004', 'workflow-uuid-0002', 1, false, ts, ts),
    ('pg-uuid-0005', 'workflow-uuid-0002', 2, true, ts, ts);

    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0002', priority_group_id = 'pg-uuid-0004', repeat_interval = 'FREQ=MINUTELY;INTERVAL=10' WHERE job_id = 'job-uuid-0013';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0002', priority_group_id = 'pg-uuid-0004', repeat_interval = 'FREQ=MINUTELY;INTERVAL=10' WHERE job_id = 'job-uuid-0002';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0002', priority_group_id = 'pg-uuid-0005', repeat_interval = 'FREQ=MINUTELY;INTERVAL=10' WHERE job_id = 'job-uuid-0026';

    -- Workflow 3: Backup Workflow (3 jobs in 2 priority groups)
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES ('workflow-uuid-0003', 'Backup-Workflow', grp_id, 'IDLE', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', ts, ts);

    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date)
    VALUES
    ('pg-uuid-0006', 'workflow-uuid-0003', 1, false, ts, ts),
    ('pg-uuid-0007', 'workflow-uuid-0003', 2, false, ts, ts);

    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0003', priority_group_id = 'pg-uuid-0006', repeat_interval = 'FREQ=MINUTELY;INTERVAL=30' WHERE job_id = 'job-uuid-0011';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0003', priority_group_id = 'pg-uuid-0006', repeat_interval = 'FREQ=MINUTELY;INTERVAL=30' WHERE job_id = 'job-uuid-0019';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0003', priority_group_id = 'pg-uuid-0007', repeat_interval = 'FREQ=MINUTELY;INTERVAL=30' WHERE job_id = 'job-uuid-0030';

    -- Workflow 4: Cleanup Workflow (2 jobs in 1 priority group)
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES ('workflow-uuid-0004', 'Cleanup-Workflow', grp_id, 'IDLE', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', ts, ts);

    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date)
    VALUES ('pg-uuid-0008', 'workflow-uuid-0004', 1, false, ts, ts);

    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0004', priority_group_id = 'pg-uuid-0008', repeat_interval = 'FREQ=HOURLY;INTERVAL=1' WHERE job_id = 'job-uuid-0006';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0004', priority_group_id = 'pg-uuid-0008', repeat_interval = 'FREQ=HOURLY;INTERVAL=1' WHERE job_id = 'job-uuid-0029';

    -- Workflow 5: Notification Workflow (2 jobs in 2 priority groups)
    INSERT INTO scheduler_workflow (id, workflow_name, group_id, latest_status, repeat_interval, timezone, frst_reg_date, last_chg_date)
    VALUES ('workflow-uuid-0005', 'Notification-Workflow', grp_id, 'IDLE', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', ts, ts);

    INSERT INTO scheduler_workflow_priority_group (id, workflow_id, priority, ignore_result, frst_reg_date, last_chg_date)
    VALUES
    ('pg-uuid-0009', 'workflow-uuid-0005', 1, false, ts, ts),
    ('pg-uuid-0010', 'workflow-uuid-0005', 2, true, ts, ts);

    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0005', priority_group_id = 'pg-uuid-0009', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0001';
    UPDATE scheduler_jobs SET workflow_id = 'workflow-uuid-0005', priority_group_id = 'pg-uuid-0010', repeat_interval = 'FREQ=MINUTELY;INTERVAL=5' WHERE job_id = 'job-uuid-0008';
END $$;
