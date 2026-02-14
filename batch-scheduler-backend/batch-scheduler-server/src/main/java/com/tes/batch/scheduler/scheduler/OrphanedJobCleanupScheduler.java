package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Scheduled task to clean up orphaned jobs.
 * Jobs stuck in RUNNING/WAITING status are marked as BROKEN in run logs,
 * and their parent scheduler_jobs.current_state is reset to SCHEDULED.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrphanedJobCleanupScheduler {

    private final JobRunLogMapper jobRunLogMapper;
    private final JobMapper jobMapper;
    private final SchedulerService schedulerService;

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
     * Mark orphaned jobs (RUNNING/WAITING for more than timeout threshold) as BROKEN.
     * Also resets the parent scheduler_jobs.current_state so jobs aren't stuck forever.
     */
    @Transactional
    public void cleanupOrphanedJobs() {
        try {
            long cutoffTime = System.currentTimeMillis() - ORPHAN_TIMEOUT_MS;

            // First, find affected job IDs before marking logs as BROKEN
            List<String> orphanedJobIds = jobRunLogMapper.findOrphanedJobIds(cutoffTime);

            // Mark orphaned run logs as BROKEN
            int cleanedCount = jobRunLogMapper.markOrphanedLogsAsBroken(cutoffTime);

            if (cleanedCount > 0) {
                log.warn("Marked {} orphaned job log(s) as BROKEN (older than {} minutes)",
                    cleanedCount, ORPHAN_TIMEOUT_MS / 60000);

                // Reset scheduler_jobs.current_state for affected jobs
                for (String jobId : orphanedJobIds) {
                    try {
                        JobVO job = jobMapper.findById(jobId);
                        if (job != null && "RUNNING".equals(job.getCurrentState())) {
                            schedulerService.rescheduleJobAfterExecution(job);
                            log.warn("Reset orphaned job {} ({}) from RUNNING and rescheduled",
                                    jobId, job.getJobName());
                        }
                    } catch (Exception e) {
                        log.error("Failed to reset state for orphaned job {}", jobId, e);
                    }
                }
            } else {
                log.debug("No orphaned jobs found");
            }
        } catch (Exception e) {
            log.error("Failed to clean up orphaned jobs", e);
        }
    }
}
