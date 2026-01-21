-- =============================================
-- Initial Data - Admin User
-- =============================================

-- Insert default admin user
-- Password: admin123 (BCrypt encoded)
INSERT INTO scheduler_users (
    id,
    user_id,
    user_name,
    user_type,
    user_status,
    user_pwd,
    login_fail_count,
    frst_reg_date,
    last_chg_date
) VALUES (
    'admin-uuid-0001-0001-000000000001',
    'admin',
    'Administrator',
    0,  -- Admin type
    true,
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3KNyQ0.tFiPWwYBMXzG2',  -- admin123
    0,
    EXTRACT(EPOCH FROM NOW()) * 1000,
    EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT (user_id) DO NOTHING;

-- Insert default job group
INSERT INTO scheduler_job_groups (
    group_id,
    group_name,
    group_description,
    frst_reg_date,
    last_chg_date
) VALUES (
    'default-group-uuid-000000000001',
    'Default',
    'Default job group',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT (group_name) DO NOTHING;
