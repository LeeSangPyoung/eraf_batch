-- Increase ssh_password column size to accommodate AES-256-GCM encrypted values
-- Encrypted format: "ENC:" + Base64(IV[12] + ciphertext + GCM_TAG[16])
ALTER TABLE scheduler_job_servers ALTER COLUMN ssh_password TYPE VARCHAR(512);
