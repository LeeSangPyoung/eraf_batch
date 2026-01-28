package com.tes.batch.scheduler.startup;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Startup service that logs server restart.
 *
 * NOTE: We do NOT immediately mark RUNNING jobs/logs as BROKEN on startup because:
 * - Agents may still be alive and executing jobs during scheduler restart
 * - Long-running jobs (e.g., 1-hour batches) should complete normally
 * - TimeoutCheckScheduler will handle actual timeouts based on max_run_duration
 *
 * This prevents false-positive BROKEN states while allowing real timeouts to be detected.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StartupCleanupService implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        log.info("=================================================");
        log.info("Batch Scheduler Server started successfully");
        log.info("RUNNING jobs/workflows will be monitored for timeout");
        log.info("Agent results will be processed normally");
        log.info("=================================================");
    }
}
