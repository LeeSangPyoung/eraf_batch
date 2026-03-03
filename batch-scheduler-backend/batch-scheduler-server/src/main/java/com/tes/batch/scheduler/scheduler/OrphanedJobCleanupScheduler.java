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
 * Scheduled task to clean up orphaned jobs and recover BROKEN jobs.
 * Jobs stuck in RUNNING/WAITING status are marked as BROKEN in run logs,
 * and their parent scheduler_jobs.current_state is reset to SCHEDULED.
 *
 * Also periodically recovers BROKEN jobs by rescheduling them.
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
        recoverBrokenJobs();
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
     * Recover BROKEN jobs every 1 minute.
     * Jobs can get stuck in BROKEN state when:
     * - Agent goes unhealthy and AgentHealthChecker marks them BROKEN
     * - Server restarts and resetRunningJobs() marks them BROKEN
     * - Orphan detection marks them BROKEN
     * In all cases, the next_run_date is not recalculated and no Quartz trigger is created,
     * so the job is permanently stuck. This method recovers them.
     */
    @Scheduled(fixedDelay = 60 * 1000, initialDelay = 30 * 1000)
    public void scheduledBrokenJobRecovery() {
        recoverBrokenJobs();
    }

    /**
     * Find all BROKEN enabled jobs and reschedule them.
     * This ensures jobs are never permanently stuck in BROKEN state.
     */
    @Transactional
    public void recoverBrokenJobs() {
        try {
            List<JobVO> brokenJobs = jobMapper.findBrokenEnabledJobs();

            if (brokenJobs.isEmpty()) {
                log.debug("No BROKEN jobs to recover");
                return;
            }

            log.warn("Found {} BROKEN job(s) to recover", brokenJobs.size());

            int recoveredCount = 0;
            for (JobVO job : brokenJobs) {
                try {
                    // Skip workflow jobs - they are managed by workflow scheduler
                    if (job.getWorkflowId() != null && !job.getWorkflowId().isEmpty()) {
                        // Just reset to SCHEDULED so workflow can pick it up
                        jobMapper.updateState(job.getJobId(), "SCHEDULED", null);
                        log.info("Reset BROKEN workflow job {} ({}) to SCHEDULED", job.getJobId(), job.getJobName());
                        recoveredCount++;
                        continue;
                    }

                    // For standalone jobs with schedule, recalculate next run and create Quartz trigger
                    if (job.getRepeatInterval() != null && !job.getRepeatInterval().isEmpty()) {
                        schedulerService.scheduleJobWithRRule(job);
                        log.info("Recovered BROKEN job {} ({}) - rescheduled", job.getJobId(), job.getJobName());
                        recoveredCount++;
                    } else {
                        // One-time job with no schedule - just reset to SCHEDULED
                        jobMapper.updateState(job.getJobId(), "SCHEDULED", null);
                        log.info("Reset BROKEN one-time job {} ({}) to SCHEDULED", job.getJobId(), job.getJobName());
                        recoveredCount++;
                    }
                } catch (Exception e) {
                    log.error("Failed to recover BROKEN job {} ({})", job.getJobId(), job.getJobName(), e);
                }
            }

            if (recoveredCount > 0) {
                log.warn("Recovered {} BROKEN job(s)", recoveredCount);
            }
        } catch (Exception e) {
            log.error("Failed to recover BROKEN jobs", e);
        }
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

                // Reset scheduler_jobs.current_state for affected jobs and reschedule
                for (String jobId : orphanedJobIds) {
                    try {
                        JobVO job = jobMapper.findById(jobId);
                        if (job != null && ("RUNNING".equals(job.getCurrentState()) || "BROKEN".equals(job.getCurrentState()))) {
                            schedulerService.rescheduleJobAfterExecution(job);
                            log.warn("Reset orphaned job {} ({}) and rescheduled",
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
