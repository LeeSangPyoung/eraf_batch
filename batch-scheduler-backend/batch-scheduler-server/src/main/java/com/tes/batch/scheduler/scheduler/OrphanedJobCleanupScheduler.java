package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task to clean up orphaned jobs.
 * Jobs stuck in RUNNING/WAITING status are marked as BROKEN.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrphanedJobCleanupScheduler {

    private final JobRunLogMapper jobRunLogMapper;

    /**
     * Timeout threshold: jobs older than this are considered orphaned
     * Default: 30 minutes
     */
    private static final long ORPHAN_TIMEOUT_MS = 30 * 60 * 1000;

    /**
     * Run cleanup on server startup to handle jobs orphaned by previous shutdown/crash
     */
    @EventListener(ApplicationReadyEvent.class)
    public void cleanupOnStartup() {
        log.info("Running orphaned job cleanup on server startup...");
        cleanupOrphanedJobs();
    }

    /**
     * Run cleanup every 5 minutes
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000, initialDelay = 5 * 60 * 1000)
    public void scheduledCleanup() {
        log.debug("Running scheduled orphaned job cleanup...");
        cleanupOrphanedJobs();
    }

    /**
     * Mark orphaned jobs (RUNNING/WAITING for more than timeout threshold) as BROKEN
     */
    private void cleanupOrphanedJobs() {
        try {
            long cutoffTime = System.currentTimeMillis() - ORPHAN_TIMEOUT_MS;
            int cleanedCount = jobRunLogMapper.markOrphanedLogsAsBroken(cutoffTime);

            if (cleanedCount > 0) {
                log.warn("Marked {} orphaned job(s) as BROKEN (older than {} minutes)",
                    cleanedCount, ORPHAN_TIMEOUT_MS / 60000);
            } else {
                log.debug("No orphaned jobs found");
            }
        } catch (Exception e) {
            log.error("Failed to clean up orphaned jobs", e);
        }
    }
}
