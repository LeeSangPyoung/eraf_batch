-- Insert 30 test jobs
DO $$
DECLARE
    ts BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
    grp_id VARCHAR := 'default-group-uuid-000000000001';
BEGIN
    -- 1-minute interval jobs (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0001', 'Success-Job-1min', 'server-uuid-0001', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/success_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=1', 'Asia/Seoul', 60, true, ts, ts),
    ('job-uuid-0002', 'Health-Check-1min', 'server-uuid-0002', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/health_check.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=1', 'Asia/Seoul', 30, true, ts, ts),
    ('job-uuid-0003', 'Random-Job-1min', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/random_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=1', 'Asia/Seoul', 60, false, ts, ts),
    ('job-uuid-0004', 'Shell-Success-1min', 'server-uuid-0004', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/success_job.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=1', 'Asia/Seoul', 60, true, ts, ts),
    ('job-uuid-0005', 'Data-Process-1min', 'server-uuid-0001', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/data_process.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=1', 'Asia/Seoul', 60, true, ts, ts);

    -- 5-minute interval jobs (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0006', 'Cleanup-5min', 'server-uuid-0002', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/cleanup.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', 120, true, ts, ts),
    ('job-uuid-0007', 'Sync-Data-5min', 'server-uuid-0003', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/sync_data.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', 120, true, ts, ts),
    ('job-uuid-0008', 'Notify-5min', 'server-uuid-0004', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/notify.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', 60, false, ts, ts),
    ('job-uuid-0009', 'Report-Gen-5min', 'server-uuid-0001', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/report_gen.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', 120, true, ts, ts),
    ('job-uuid-0010', 'Long-Job-5min', 'server-uuid-0002', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/long_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=5', 'Asia/Seoul', 180, true, ts, ts);

    -- 10-minute interval jobs (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0011', 'Backup-10min', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/backup.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', 300, true, ts, ts),
    ('job-uuid-0012', 'Success-Job-10min', 'server-uuid-0004', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/success_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', 60, true, ts, ts),
    ('job-uuid-0013', 'Health-Check-10min', 'server-uuid-0001', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/health_check.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', 30, false, ts, ts),
    ('job-uuid-0014', 'Cleanup-10min', 'server-uuid-0002', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/cleanup.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', 120, true, ts, ts),
    ('job-uuid-0015', 'Random-Job-10min', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/random_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=10', 'Asia/Seoul', 60, true, ts, ts);

    -- 30-minute interval jobs (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0016', 'Data-Process-30min', 'server-uuid-0004', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/data_process.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', 300, true, ts, ts),
    ('job-uuid-0017', 'Report-Gen-30min', 'server-uuid-0001', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/report_gen.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', 300, true, ts, ts),
    ('job-uuid-0018', 'Sync-Data-30min', 'server-uuid-0002', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/sync_data.sh', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', 180, false, ts, ts),
    ('job-uuid-0019', 'Backup-30min', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/backup.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', 300, true, ts, ts),
    ('job-uuid-0020', 'Long-Job-30min', 'server-uuid-0004', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/long_job.py', true, 'SCHEDULED', 'FREQ=MINUTELY;INTERVAL=30', 'Asia/Seoul', 300, true, ts, ts);

    -- 1-hour interval jobs (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0021', 'Hourly-Cleanup', 'server-uuid-0001', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/cleanup.sh', true, 'SCHEDULED', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', 300, true, ts, ts),
    ('job-uuid-0022', 'Hourly-Backup', 'server-uuid-0002', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/backup.py', true, 'SCHEDULED', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', 600, true, ts, ts),
    ('job-uuid-0023', 'Hourly-Report', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/report_gen.py', true, 'SCHEDULED', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', 300, false, ts, ts),
    ('job-uuid-0024', 'Hourly-Health', 'server-uuid-0004', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/health_check.sh', true, 'SCHEDULED', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', 60, true, ts, ts),
    ('job-uuid-0025', 'Hourly-Sync', 'server-uuid-0001', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/sync_data.sh', true, 'SCHEDULED', 'FREQ=HOURLY;INTERVAL=1', 'Asia/Seoul', 300, true, ts, ts);

    -- On-demand jobs (no schedule, for workflow use) (5 jobs)
    INSERT INTO scheduler_jobs (job_id, job_name, system_id, group_id, job_type, job_action, is_enabled, current_state, repeat_interval, timezone, max_run_duration, restartable, frst_reg_date, last_chg_date)
    VALUES
    ('job-uuid-0026', 'OnDemand-Success', 'server-uuid-0002', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/success_job.py', true, 'IDLE', NULL, 'Asia/Seoul', 60, false, ts, ts),
    ('job-uuid-0027', 'OnDemand-Process', 'server-uuid-0003', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/data_process.py', true, 'IDLE', NULL, 'Asia/Seoul', 120, false, ts, ts),
    ('job-uuid-0028', 'OnDemand-Notify', 'server-uuid-0004', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/notify.py', true, 'IDLE', NULL, 'Asia/Seoul', 60, false, ts, ts),
    ('job-uuid-0029', 'OnDemand-Cleanup', 'server-uuid-0001', grp_id, 'EXECUTABLE', '/workspace/batch-jobs/cleanup.sh', true, 'IDLE', NULL, 'Asia/Seoul', 120, false, ts, ts),
    ('job-uuid-0030', 'OnDemand-Backup', 'server-uuid-0002', grp_id, 'EXECUTABLE', 'python3 /workspace/batch-jobs/backup.py', true, 'IDLE', NULL, 'Asia/Seoul', 300, false, ts, ts);
END $$;
