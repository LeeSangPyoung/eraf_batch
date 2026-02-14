package com.tes.batch.scheduler.startup;

import com.tes.batch.scheduler.crypto.CryptoService;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Migrates existing plain-text SSH passwords to encrypted format on startup.
 * Runs once - already encrypted passwords (with ENC: prefix) are skipped.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class PasswordMigrationService implements ApplicationRunner {

    private final JobServerMapper serverMapper;
    private final CryptoService cryptoService;

    @Override
    public void run(ApplicationArguments args) {
        if (!cryptoService.isEnabled()) {
            log.info("Encryption not enabled, skipping password migration");
            return;
        }

        log.info("Checking for plain-text SSH passwords to migrate...");
        List<JobServerVO> servers = serverMapper.findAll();
        int migrated = 0;

        for (JobServerVO server : servers) {
            String password = server.getSshPassword();
            if (password != null && !password.isEmpty() && !cryptoService.isEncrypted(password)) {
                try {
                    String encrypted = cryptoService.encrypt(password);
                    serverMapper.updateSshPassword(server.getSystemId(), encrypted);
                    migrated++;
                    log.info("Migrated SSH password for server: {}", server.getSystemName());
                } catch (Exception e) {
                    log.error("Failed to migrate SSH password for server {}: {}",
                            server.getSystemName(), e.getMessage());
                }
            }
        }

        if (migrated > 0) {
            log.info("Password migration completed: {} server(s) migrated", migrated);
        } else {
            log.info("No plain-text passwords found to migrate");
        }
    }
}
