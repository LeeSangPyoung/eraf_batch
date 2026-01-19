package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.List;

/**
 * Service for managing job scheduling with Quartz
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final Scheduler scheduler;
    private final JobMapper jobMapper;
    private final WorkflowMapper workflowMapper;
    private final RRuleParser rruleParser;

    /**
     * Schedule a job at a specific time
     */
    public void scheduleJob(JobVO job, Long nextRunDate) {
        try {
            JobKey jobKey = JobKey.jobKey(job.getJobId(), "batch-jobs");
            TriggerKey triggerKey = TriggerKey.triggerKey(job.getJobId() + "_trigger", "batch-triggers");

            // Remove existing job if any
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
            }

            // Create job detail
            JobDetail jobDetail = JobBuilder.newJob(BatchJobExecutor.class)
                    .withIdentity(jobKey)
                    .usingJobData("jobId", job.getJobId())
                    .storeDurably()
                    .build();

            // Create trigger
            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .startAt(Date.from(Instant.ofEpochMilli(nextRunDate)))
                    .build();

            scheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled job: {} at {}", job.getJobId(), Instant.ofEpochMilli(nextRunDate));

        } catch (SchedulerException e) {
            log.error("Failed to schedule job: {}", job.getJobId(), e);
        }
    }

    /**
     * Unschedule a job
     */
    public void unscheduleJob(String jobId) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, "batch-jobs");
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Unscheduled job: {}", jobId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to unschedule job: {}", jobId, e);
        }
    }

    /**
     * Pause a job
     */
    public void pauseJob(String jobId) {
        try {
            JobKey jobKey = JobKey.jobKey(jobId, "batch-jobs");
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
            JobKey jobKey = JobKey.jobKey(jobId, "batch-jobs");
            scheduler.resumeJob(jobKey);
            log.info("Resumed job: {}", jobId);
        } catch (SchedulerException e) {
            log.error("Failed to resume job: {}", jobId, e);
        }
    }

    /**
     * Calculate next run date based on RRULE
     */
    public Long calculateNextRunDate(JobVO job) {
        if (job.getRepeatInterval() == null || job.getRepeatInterval().isEmpty()) {
            return null;
        }

        try {
            String timezone = job.getTimezone() != null ? job.getTimezone() : "UTC";
            ZoneId zoneId = ZoneId.of(timezone);

            // Start from now or job start date, whichever is later
            long now = System.currentTimeMillis();
            long startFrom = job.getStartDate() != null ? Math.max(now, job.getStartDate()) : now;

            // Check end date
            if (job.getEndDate() != null && now > job.getEndDate()) {
                return null;
            }

            // Check max run count
            if (job.getMaxRun() != null && job.getMaxRun() > 0 && job.getRunCount() >= job.getMaxRun()) {
                return null;
            }

            // Parse RRULE and get next occurrence
            ZonedDateTime startDateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(startFrom), zoneId);
            ZonedDateTime nextRun = rruleParser.getNextOccurrence(job.getRepeatInterval(), startDateTime);

            if (nextRun != null) {
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
            String timezone = workflow.getTimezone() != null ? workflow.getTimezone() : "UTC";
            ZoneId zoneId = ZoneId.of(timezone);

            long now = System.currentTimeMillis();
            long startFrom = workflow.getStartDate() != null ? Math.max(now, workflow.getStartDate()) : now;

            ZonedDateTime startDateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(startFrom), zoneId);
            ZonedDateTime nextRun = rruleParser.getNextOccurrence(workflow.getRepeatInterval(), startDateTime);

            if (nextRun != null) {
                return nextRun.toInstant().toEpochMilli();
            }

        } catch (Exception e) {
            log.error("Failed to calculate next run date for workflow: {}", workflow.getId(), e);
        }

        return null;
    }

    /**
     * Periodically check for jobs that need to be scheduled
     * Runs every minute
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void checkAndScheduleJobs() {
        long now = System.currentTimeMillis();

        // Find jobs that should be executed
        List<JobVO> jobsToExecute = jobMapper.findJobsToExecute(now);

        for (JobVO job : jobsToExecute) {
            try {
                // Trigger job execution
                triggerJobExecution(job);
            } catch (Exception e) {
                log.error("Failed to trigger job execution: {}", job.getJobId(), e);
            }
        }

        // Find workflows that should be executed
        List<WorkflowVO> workflowsToExecute = workflowMapper.findWorkflowsToExecute(now);

        for (WorkflowVO workflow : workflowsToExecute) {
            try {
                // Trigger workflow execution
                triggerWorkflowExecution(workflow);
            } catch (Exception e) {
                log.error("Failed to trigger workflow execution: {}", workflow.getId(), e);
            }
        }
    }

    /**
     * Trigger immediate job execution
     */
    private void triggerJobExecution(JobVO job) {
        try {
            JobKey jobKey = JobKey.jobKey(job.getJobId(), "batch-jobs");

            // Create job detail if not exists
            if (!scheduler.checkExists(jobKey)) {
                JobDetail jobDetail = JobBuilder.newJob(BatchJobExecutor.class)
                        .withIdentity(jobKey)
                        .usingJobData("jobId", job.getJobId())
                        .storeDurably()
                        .build();
                scheduler.addJob(jobDetail, true);
            }

            // Trigger now
            scheduler.triggerJob(jobKey);
            log.info("Triggered job execution: {}", job.getJobId());

        } catch (SchedulerException e) {
            log.error("Failed to trigger job: {}", job.getJobId(), e);
        }
    }

    /**
     * Trigger workflow execution
     */
    private void triggerWorkflowExecution(WorkflowVO workflow) {
        // TODO: Implement workflow execution in Phase 10
        log.info("Workflow execution triggered: {}", workflow.getId());
    }

    /**
     * Initialize scheduler on startup - reschedule all active jobs
     */
    @Transactional
    public void initializeScheduler() {
        log.info("Initializing scheduler, loading active jobs...");

        // This would typically load all enabled jobs and schedule them
        // For now, the periodic check will handle scheduling
    }
}
