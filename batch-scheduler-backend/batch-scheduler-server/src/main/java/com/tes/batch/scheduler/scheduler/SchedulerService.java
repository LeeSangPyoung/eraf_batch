package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowRunMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

/**
 * Service for managing job scheduling with Quartz.
 * Uses Quartz native scheduling instead of DB polling for efficiency.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final Scheduler scheduler;
    private final JobMapper jobMapper;
    private final WorkflowMapper workflowMapper;
    private final WorkflowRunMapper workflowRunMapper;
    private final RRuleParser rruleParser;

    private static final String JOB_GROUP = "batch-jobs";
    private static final String TRIGGER_GROUP = "batch-triggers";
    private static final String WORKFLOW_GROUP = "batch-workflows";
    private static final String WORKFLOW_TRIGGER_GROUP = "batch-workflow-triggers";

    /**
     * Initialize scheduler on startup - load all enabled jobs
     */
    @PostConstruct
    public void initializeScheduler() {
        log.info("Initializing Quartz scheduler, loading active jobs...");
        try {
            // Clean up stuck RUNNING jobs from previous server shutdown
            int resetCount = jobMapper.resetRunningJobs();
            if (resetCount > 0) {
                log.info("Reset {} stuck RUNNING jobs to BROKEN", resetCount);
            }

            // Recovery: Execute missed restartable jobs (only last 1 per job)
            recoverMissedRestartableJobs();

            // Load all enabled jobs with repeat interval
            List<JobVO> enabledJobs = jobMapper.findEnabledJobsWithSchedule();
            log.info("Found {} enabled jobs with schedule", enabledJobs.size());

            for (JobVO job : enabledJobs) {
                try {
                    scheduleJobWithRRule(job);
                } catch (Exception e) {
                    log.error("Failed to schedule job on startup: {}", job.getJobId(), e);
                }
            }

            // Clean up stuck workflow runs from previous server shutdown
            cleanupStuckWorkflowRuns();

            // Load enabled workflows
            List<WorkflowVO> enabledWorkflows = workflowMapper.findEnabledWorkflowsWithSchedule();
            log.info("Found {} enabled workflows with schedule", enabledWorkflows.size());

            for (WorkflowVO workflow : enabledWorkflows) {
                try {
                    scheduleWorkflowWithRRule(workflow);
                } catch (Exception e) {
                    log.error("Failed to schedule workflow on startup: {}", workflow.getId(), e);
                }
            }

            log.info("Quartz scheduler initialization complete");
        } catch (Exception e) {
            log.error("Failed to initialize scheduler", e);
        }
    }

    /**
     * Recover missed restartable jobs on server startup.
     * If a job has restartable=true and missed its schedule during server downtime,
     * execute it once immediately.
     */
    private void recoverMissedRestartableJobs() {
        try {
            long now = System.currentTimeMillis();
            List<JobVO> missedJobs = jobMapper.findMissedRestartableJobs(now);

            if (missedJobs.isEmpty()) {
                log.info("No missed restartable jobs found");
                return;
            }

            log.info("Found {} missed restartable jobs for recovery execution", missedJobs.size());

            for (JobVO job : missedJobs) {
                try {
                    log.info("Recovery: Executing missed job {} (name: {}, missed schedule: {})",
                            job.getJobId(), job.getJobName(),
                            Instant.ofEpochMilli(job.getNextRunDate()));

                    // Schedule for immediate execution (1 second from now to allow Quartz to process)
                    long immediateRun = now + 1000;
                    scheduleJob(job.getJobId(), immediateRun);

                    // Note: The job's next_run_date will be updated by scheduleJobWithRRule
                    // after this job completes in rescheduleJobAfterExecution()

                } catch (Exception e) {
                    log.error("Failed to recover missed job: {} ({})", job.getJobId(), job.getJobName(), e);
                }
            }

            log.info("Recovery execution scheduled for {} missed jobs", missedJobs.size());

        } catch (Exception e) {
            log.warn("Failed to recover missed restartable jobs", e);
        }
    }

    /**
     * Mark all RUNNING workflow runs as FAILED on startup (stuck from previous shutdown)
     */
    private void cleanupStuckWorkflowRuns() {
        try {
            List<WorkflowRunVO> stuckRuns = workflowRunMapper.findRunningWorkflows();
            long now = System.currentTimeMillis();
            for (WorkflowRunVO run : stuckRuns) {
                workflowRunMapper.updateStatus(
                        run.getWorkflowRunId(),
                        "FAILED",
                        now,
                        run.getStartDate() != null ? now - run.getStartDate() : null,
                        "Server restarted while workflow was running"
                );
                if (run.getWorkflowId() != null) {
                    workflowMapper.updateStatus(run.getWorkflowId(), "FAILED", now, null);
                }
                log.info("Cleaned up stuck workflow run: {}", run.getWorkflowRunId());
            }
            if (!stuckRuns.isEmpty()) {
                log.info("Cleaned up {} stuck workflow runs", stuckRuns.size());
            }
        } catch (Exception e) {
            log.warn("Failed to cleanup stuck workflow runs", e);
        }
    }

    /**
     * Schedule a job using RRULE - calculates next run time and schedules with Quartz
     */
    public void scheduleJobWithRRule(JobVO job) {
        if (job.getRepeatInterval() == null || job.getRepeatInterval().isEmpty()) {
            log.debug("Job {} has no repeat interval, skipping schedule", job.getJobId());
            return;
        }

        if (!Boolean.TRUE.equals(job.getIsEnabled())) {
            log.debug("Job {} is disabled, skipping schedule", job.getJobId());
            return;
        }

        // Skip jobs that belong to a workflow - they are managed by the workflow scheduler
        if (job.getWorkflowId() != null && !job.getWorkflowId().isEmpty()) {
            log.debug("Job {} belongs to workflow {}, skipping individual schedule", job.getJobId(), job.getWorkflowId());
            return;
        }

        // Skip jobs in terminal states (DELETED, COMPLETED)
        String currentState = job.getCurrentState();
        if ("DELETED".equals(currentState) || "COMPLETED".equals(currentState)) {
            log.debug("Job {} is in terminal state {}, skipping schedule", job.getJobId(), currentState);
            return;
        }

        Long nextRunDate = calculateNextRunDate(job);
        if (nextRunDate == null) {
            log.debug("No next run date for job {}", job.getJobId());
            return;
        }

        // Update next_run_date in DB
        jobMapper.updateState(job.getJobId(), "SCHEDULED", nextRunDate);

        // Schedule with Quartz
        scheduleJob(job.getJobId(), nextRunDate);
    }

    /**
     * Schedule a job at a specific time using Quartz SimpleTrigger
     */
    public void scheduleJob(String jobId, Long nextRunDate) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, JOB_GROUP);
            TriggerKey triggerKey = TriggerKey.triggerKey(jobId + "_trigger", TRIGGER_GROUP);

            // Remove existing job if any
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
            }

            // Create job detail
            JobDetail jobDetail = JobBuilder.newJob(BatchJobExecutor.class)
                    .withIdentity(jobKey)
                    .usingJobData("jobId", jobId)
                    .storeDurably(false)
                    .build();

            // Create trigger for specific time
            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .startAt(Date.from(Instant.ofEpochMilli(nextRunDate)))
                    .build();

            scheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled job {} at {}", jobId, Instant.ofEpochMilli(nextRunDate));

        } catch (SchedulerException e) {
            log.error("Failed to schedule job: {}", jobId, e);
        }
    }

    /**
     * Reschedule a job after execution - called by BatchJobExecutor
     */
    public void rescheduleJobAfterExecution(JobVO job) {
        Long nextRunDate = calculateNextRunDate(job);
        if (nextRunDate != null) {
            jobMapper.updateState(job.getJobId(), "SCHEDULED", nextRunDate);
            scheduleJob(job.getJobId(), nextRunDate);
            log.info("Rescheduled job {} for next run at {}", job.getJobId(), Instant.ofEpochMilli(nextRunDate));
        } else {
            // No more runs - set state to COMPLETED
            jobMapper.updateState(job.getJobId(), "COMPLETED", null);
            log.info("Job {} completed - no more runs scheduled (runCount={}, maxRun={})",
                    job.getJobId(), job.getRunCount(), job.getMaxRun());
        }
    }

    /**
     * Schedule a workflow using RRULE
     */
    public void scheduleWorkflowWithRRule(WorkflowVO workflow) {
        if (workflow.getRepeatInterval() == null || workflow.getRepeatInterval().isEmpty()) {
            log.debug("Workflow {} has no repeat interval, skipping schedule", workflow.getId());
            return;
        }

        Long nextRunDate = calculateNextRunDate(workflow);
        if (nextRunDate == null) {
            log.debug("No next run date for workflow {}", workflow.getId());
            return;
        }

        // Update next_run_date in DB
        workflowMapper.updateNextRunDate(workflow.getId(), nextRunDate);

        // Schedule with Quartz
        scheduleWorkflow(workflow.getId(), nextRunDate);
    }

    /**
     * Schedule a workflow at a specific time
     */
    public void scheduleWorkflow(String workflowId, Long nextRunDate) {
        try {
            JobKey jobKey = JobKey.jobKey(workflowId, WORKFLOW_GROUP);
            TriggerKey triggerKey = TriggerKey.triggerKey(workflowId + "_trigger", WORKFLOW_TRIGGER_GROUP);

            // Remove existing if any
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
            }

            // Create job detail for workflow
            JobDetail jobDetail = JobBuilder.newJob(BatchWorkflowExecutor.class)
                    .withIdentity(jobKey)
                    .usingJobData("workflowId", workflowId)
                    .storeDurably(false)
                    .build();

            // Create trigger
            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .startAt(Date.from(Instant.ofEpochMilli(nextRunDate)))
                    .build();

            scheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled workflow {} at {}", workflowId, Instant.ofEpochMilli(nextRunDate));

        } catch (SchedulerException e) {
            log.error("Failed to schedule workflow: {}", workflowId, e);
        }
    }

    /**
     * Unschedule a job
     */
    public void unscheduleJob(String jobId) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, JOB_GROUP);
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Unscheduled job: {}", jobId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to unschedule job: {}", jobId, e);
        }
    }

    /**
     * Unschedule a workflow
     */
    public void unscheduleWorkflow(String workflowId) {
        try {
            JobKey jobKey = JobKey.jobKey(workflowId, WORKFLOW_GROUP);
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Unscheduled workflow: {}", workflowId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to unschedule workflow: {}", workflowId, e);
        }
    }

    /**
     * Pause a job
     */
    public void pauseJob(String jobId) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, JOB_GROUP);
            scheduler.pauseJob(jobKey);
            log.info("Paused job: {}", jobId);
        } catch (SchedulerException e) {
            log.error("Failed to pause job: {}", jobId, e);
        }
    }

    /**
     * Resume a job
     */
    public void resumeJob(String jobId) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, JOB_GROUP);
            scheduler.resumeJob(jobKey);
            log.info("Resumed job: {}", jobId);
        } catch (SchedulerException e) {
            log.error("Failed to resume job: {}", jobId, e);
        }
    }

    /**
     * Calculate next run date based on RRULE.
     * RRULE is calculated from Job's Start Date as the base, finding the next occurrence after now.
     */
    public Long calculateNextRunDate(JobVO job) {
        if (job.getRepeatInterval() == null || job.getRepeatInterval().isEmpty()) {
            return null;
        }

        try {
            String timezone = job.getTimezone() != null ? job.getTimezone() : "Asia/Seoul";
            ZoneId zoneId = ZoneId.of(timezone);

            long now = System.currentTimeMillis();

            // Check end date
            if (job.getEndDate() != null && now > job.getEndDate()) {
                log.info("Job {} reached end date, no more runs scheduled", job.getJobId());
                return null;
            }

            // Check max run count
            if (job.getMaxRun() != null && job.getMaxRun() > 0 && job.getRunCount() >= job.getMaxRun()) {
                log.info("Job {} reached max run count ({}/{}), no more runs scheduled",
                        job.getJobId(), job.getRunCount(), job.getMaxRun());
                return null;
            }

            // RRULE calculation:
            // - start: Job's Start Date (base for RRULE pattern)
            // - after: current time (find next occurrence after now)
            long startDate = job.getStartDate() != null ? job.getStartDate() : now;
            ZonedDateTime start = ZonedDateTime.ofInstant(Instant.ofEpochMilli(startDate), zoneId);
            ZonedDateTime after = ZonedDateTime.ofInstant(Instant.ofEpochMilli(now), zoneId);

            ZonedDateTime nextRun = rruleParser.getNextOccurrence(job.getRepeatInterval(), start, after);

            if (nextRun != null) {
                // If RRULE is not SECONDLY, normalize to :00 seconds for precise scheduling
                if (!job.getRepeatInterval().contains("FREQ=SECONDLY")) {
                    nextRun = nextRun.withSecond(0).withNano(0);
                }

                long nextRunMs = nextRun.toInstant().toEpochMilli();

                // Check if within end date
                if (job.getEndDate() != null && nextRunMs > job.getEndDate()) {
                    return null;
                }

                return nextRunMs;
            }

        } catch (Exception e) {
            log.error("Failed to calculate next run date for job: {}", job.getJobId(), e);
        }

        return null;
    }

    /**
     * Calculate next run date for workflow
     */
    public Long calculateNextRunDate(WorkflowVO workflow) {
        if (workflow.getRepeatInterval() == null || workflow.getRepeatInterval().isEmpty()) {
            return null;
        }

        try {
            String timezone = workflow.getTimezone() != null ? workflow.getTimezone() : "Asia/Seoul";
            ZoneId zoneId = ZoneId.of(timezone);

            long now = System.currentTimeMillis();
            long startDate = workflow.getStartDate() != null ? workflow.getStartDate() : now;

            ZonedDateTime start = ZonedDateTime.ofInstant(Instant.ofEpochMilli(startDate), zoneId);
            ZonedDateTime after = ZonedDateTime.ofInstant(Instant.ofEpochMilli(now), zoneId);

            ZonedDateTime nextRun = rruleParser.getNextOccurrence(workflow.getRepeatInterval(), start, after);

            if (nextRun != null) {
                // If RRULE is not SECONDLY, normalize to :00 seconds for precise scheduling
                if (!workflow.getRepeatInterval().contains("FREQ=SECONDLY")) {
                    nextRun = nextRun.withSecond(0).withNano(0);
                }

                return nextRun.toInstant().toEpochMilli();
            }

        } catch (Exception e) {
            log.error("Failed to calculate next run date for workflow: {}", workflow.getId(), e);
        }

        return null;
    }
}
