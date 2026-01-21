-- =============================================
-- TES Batch Scheduler - Initial Schema
-- =============================================

-- User table
CREATE TABLE IF NOT EXISTS scheduler_users (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    user_name VARCHAR(100),
    user_type INTEGER DEFAULT 1,
    user_status BOOLEAN DEFAULT true,
    user_pwd VARCHAR(255),
    celp_tlno VARCHAR(255),
    email_addr VARCHAR(255),
    login_fail_count INTEGER DEFAULT 0,
    last_pwd_chg_date BIGINT,
    last_login_time BIGINT,
    last_activity_time BIGINT,
    frst_reg_date BIGINT,
    last_chg_date BIGINT
);

-- Job Group table
CREATE TABLE IF NOT EXISTS scheduler_job_groups (
    group_id VARCHAR(36) PRIMARY KEY,
    group_name VARCHAR(100) UNIQUE NOT NULL,
    group_description TEXT,
    frst_reg_date BIGINT,
    last_chg_date BIGINT
);

-- Job Server table
CREATE TABLE IF NOT EXISTS scheduler_job_servers (
    system_id VARCHAR(36) PRIMARY KEY,
    system_name VARCHAR(100) UNIQUE NOT NULL,
    host_name VARCHAR(255),
    host_ip_addr VARCHAR(50),
    secondary_host_ip_addr VARCHAR(50),
    system_comments TEXT,
    queue_name VARCHAR(100),
    folder_path VARCHAR(500),
    secondary_folder_path VARCHAR(500),
    ssh_user VARCHAR(100),
    agent_status VARCHAR(20) DEFAULT 'OFFLINE',
    frst_reg_date BIGINT,
    last_chg_date BIGINT,
    frst_reg_user_id VARCHAR(36),
    last_reg_user_id VARCHAR(36)
);

-- Job table
CREATE TABLE IF NOT EXISTS scheduler_jobs (
    job_id VARCHAR(36) PRIMARY KEY,
    job_name VARCHAR(200) UNIQUE NOT NULL,
    system_id VARCHAR(36) REFERENCES scheduler_job_servers(system_id),
    group_id VARCHAR(36) REFERENCES scheduler_job_groups(group_id),
    job_type VARCHAR(20) NOT NULL,
    job_action TEXT,
    job_body TEXT,
    start_date BIGINT,
    end_date BIGINT,
    repeat_interval TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    max_run INTEGER DEFAULT 0,
    max_failure INTEGER DEFAULT 0,
    max_run_duration VARCHAR(20) DEFAULT '01:00:00',
    retry_delay INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 3,
    is_enabled BOOLEAN DEFAULT true,
    current_state VARCHAR(20) DEFAULT 'SCHEDULED',
    next_run_date BIGINT,
    last_start_date BIGINT,
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    auto_drop BOOLEAN DEFAULT false,
    restart_on_failure BOOLEAN DEFAULT false,
    restartable BOOLEAN DEFAULT true,
    ignore_result BOOLEAN DEFAULT false,
    workflow_id VARCHAR(36),
    priority_group_id VARCHAR(36),
    workflow_delay INTEGER DEFAULT 0,
    frst_reg_date BIGINT,
    last_chg_date BIGINT
);

-- Job Run Log table
CREATE TABLE IF NOT EXISTS scheduler_job_run_logs (
    log_id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(36) REFERENCES scheduler_jobs(job_id),
    task_id VARCHAR(100),
    status VARCHAR(20),
    output TEXT,
    error TEXT,
    duration VARCHAR(20),
    start_time BIGINT,
    end_time BIGINT,
    scheduled_time BIGINT,
    retry_attempt INTEGER DEFAULT 0,
    frst_reg_date BIGINT
);

-- Workflow table
CREATE TABLE IF NOT EXISTS scheduler_workflow (
    id VARCHAR(36) PRIMARY KEY,
    workflow_name VARCHAR(200) UNIQUE NOT NULL,
    group_id VARCHAR(36) REFERENCES scheduler_job_groups(group_id),
    latest_status VARCHAR(20),
    start_date BIGINT,
    repeat_interval TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    next_run_date BIGINT,
    last_run_date BIGINT,
    is_enabled BOOLEAN DEFAULT true,
    frst_reg_date BIGINT,
    last_chg_date BIGINT
);

-- Workflow Priority Group table
CREATE TABLE IF NOT EXISTS scheduler_workflow_priority_group (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) REFERENCES scheduler_workflow(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    ignore_result BOOLEAN DEFAULT false,
    frst_reg_date BIGINT,
    last_chg_date BIGINT
);

-- Workflow Priority Group Jobs (Many-to-Many)
CREATE TABLE IF NOT EXISTS scheduler_workflow_priority_group_jobs (
    priority_group_id VARCHAR(36) REFERENCES scheduler_workflow_priority_group(id) ON DELETE CASCADE,
    job_id VARCHAR(36) REFERENCES scheduler_jobs(job_id) ON DELETE CASCADE,
    PRIMARY KEY (priority_group_id, job_id)
);

-- Workflow Run table
CREATE TABLE IF NOT EXISTS scheduler_workflow_run (
    workflow_run_id BIGSERIAL PRIMARY KEY,
    workflow_id VARCHAR(36) REFERENCES scheduler_workflow(id),
    status VARCHAR(20),
    error_message TEXT,
    start_time BIGINT,
    end_time BIGINT,
    frst_reg_date BIGINT
);

-- User-Group relation table
CREATE TABLE IF NOT EXISTS scheduler_related_group_user (
    user_id VARCHAR(36) REFERENCES scheduler_users(id) ON DELETE CASCADE,
    group_id VARCHAR(36) REFERENCES scheduler_job_groups(group_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_system_id ON scheduler_jobs(system_id);
CREATE INDEX IF NOT EXISTS idx_jobs_group_id ON scheduler_jobs(group_id);
CREATE INDEX IF NOT EXISTS idx_jobs_workflow_id ON scheduler_jobs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_jobs_next_run_date ON scheduler_jobs(next_run_date);
CREATE INDEX IF NOT EXISTS idx_jobs_current_state ON scheduler_jobs(current_state);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_job_id ON scheduler_job_run_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_run_logs_start_time ON scheduler_job_run_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_workflow_group_id ON scheduler_workflow(group_id);
CREATE INDEX IF NOT EXISTS idx_workflow_run_workflow_id ON scheduler_workflow_run(workflow_id);
