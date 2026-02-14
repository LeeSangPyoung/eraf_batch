package com.tes.batch.scheduler.message;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.common.dto.JobResult;
import com.tes.batch.common.enums.TaskStatus;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.scheduler.SchedulerService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.TimeUnit;

/**
 * Listens for job results from Agents via Redis List (BRPOP)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobResultListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final ObjectMapper objectMapper;
    private final SchedulerService schedulerService;
    private final PlatformTransactionManager transactionManager;

    private static final String RESULT_LIST_KEY = "job:result";
    private Thread consumerThread;

    @PostConstruct
    public void startListening() {
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        consumerThread = new Thread(() -> {
            log.info("Started job result consumer on list: {}", RESULT_LIST_KEY);
            long backoffMs = 2000;
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Object message = redisTemplate.opsForList().rightPop(RESULT_LIST_KEY, 5, TimeUnit.SECONDS);
                    if (message != null) {
                        JobResult result = objectMapper.convertValue(message, JobResult.class);
                        log.info("Received job result: jobId={}, status={}", result.getJobId(), result.getStatus());
                        txTemplate.executeWithoutResult(status -> processResult(result));
                    }
                    backoffMs = 2000; // [P8] reset on success
                } catch (Exception e) {
                    if (Thread.currentThread().isInterrupted()) {
                        break;
                    }
                    log.error("Error consuming job result, retrying in {}ms", backoffMs, e);
                    try {
                        Thread.sleep(backoffMs);
                        backoffMs = Math.min(backoffMs * 2, 30000); // [P8] exponential backoff, max 30s
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
            log.info("Job result consumer stopped");
        }, "job-result-consumer");
        consumerThread.setDaemon(true);
        consumerThread.start();
    }

    @PreDestroy
    public void stopListening() {
        if (consumerThread != null) {
            consumerThread.interrupt();
            log.info("Job result consumer shutdown requested");
        }
    }

    private void processResult(JobResult result) {
        String jobId = result.getJobId();
        TaskStatus status = result.getStatus();

        // Get current job
        JobVO job = jobMapper.findById(jobId);
        if (job == null) {
            log.warn("Job not found for result: {}", jobId);
            return;
        }

        // Handle RETRY status separately - just update log and retryCount, keep job RUNNING
        if (status == TaskStatus.RETRY) {
            processRetryResult(result, job);
            return;
        }

        // [F7] State transition validation - skip if job is already in terminal state
        String currentState = job.getCurrentState();
        if ("COMPLETED".equals(currentState) || "DELETED".equals(currentState)) {
            log.warn("Job {} is already in terminal state {}, ignoring result with status {}",
                    jobId, currentState, status);
            updateRunLog(result, status); // still update log for audit
            return;
        }

        // Update job stats
        int runCount = job.getRunCount() != null ? job.getRunCount() : 0;
        int failureCount = job.getFailureCount() != null ? job.getFailureCount() : 0;
        int retryCount = job.getRetryCount() != null ? job.getRetryCount() : 0;

        if (status == TaskStatus.SUCCESS) {
            runCount++;
        } else if (status == TaskStatus.FAILED || status == TaskStatus.TIMEOUT) {
            failureCount++;
        }

        // Update run_count, failure_count, retry_count, and last_start_date
        Long lastStartDate = (status == TaskStatus.RUNNING) ? System.currentTimeMillis() :
                           (result.getStartTime() != null ? result.getStartTime() : System.currentTimeMillis());
        jobMapper.updateRunStats(jobId, lastStartDate, runCount, failureCount, retryCount);

        // Check if this is a workflow-managed job
        boolean isWorkflowJob = job.getWorkflowId() != null && !job.getWorkflowId().isEmpty();

        // Update job state and reschedule
        if (status == TaskStatus.RUNNING) {
            // Update state to RUNNING so UI reflects actual execution
            jobMapper.updateState(jobId, "RUNNING", job.getNextRunDate());
            log.debug("Job {} is now RUNNING", jobId);
        } else if (isWorkflowJob) {
            // Workflow jobs: check autoDrop first
            if (Boolean.TRUE.equals(job.getAutoDrop())) {
                // Auto Drop: job runs once then becomes COMPLETED (will be skipped in future workflow runs)
                jobMapper.updateState(jobId, "COMPLETED", null);
                log.info("Workflow job {} completed with autoDrop=true, state set to COMPLETED (status={})", jobId, status);
            } else if (status == TaskStatus.SUCCESS) {
                // Immediately set to SCHEDULED so UI doesn't show as RUNNING
                jobMapper.updateState(jobId, "SCHEDULED", null);
                log.info("Workflow job {} completed successfully, state set to SCHEDULED", jobId);
            } else {
                jobMapper.updateState(jobId, "BROKEN", null);
                log.info("Workflow job {} failed with state BROKEN", jobId);
            }
        } else {
            // Standalone jobs: check autoDrop first, then reschedule
            if (Boolean.TRUE.equals(job.getAutoDrop())) {
                // Auto Drop: job runs once then becomes DELETED (regardless of success/failure)
                jobMapper.updateState(jobId, "DELETED", null);
                schedulerService.unscheduleJob(jobId);
                log.info("Standalone job {} completed with autoDrop=true, state set to DELETED (status={})", jobId, status);
            } else {
                // Normal: reschedule for next run
                // Update job object with new counts so maxRun check uses current values
                job.setRunCount(runCount);
                job.setFailureCount(failureCount);
                schedulerService.rescheduleJobAfterExecution(job);
                log.info("Standalone job {} completed with status {}, runCount={}, rescheduled", jobId, status, runCount);
            }
        }

        // Update run log
        updateRunLog(result, status);

        log.info("Processed job result: {} - {}", jobId, status);
    }

    /**
     * Handle RETRY status - create log entry for each retry attempt
     * Job name stays unchanged, only retry_attempt (RETRY COUNT) shows the attempt number
     */
    private void processRetryResult(JobResult result, JobVO job) {
        String jobId = result.getJobId();
        int retryAttempt = result.getRetryAttempt() != null ? result.getRetryAttempt() : 0;

        // Increment cumulative retryCount in job stats
        int cumulativeRetryCount = job.getRetryCount() != null ? job.getRetryCount() : 0;
        cumulativeRetryCount++;

        Long lastStartDate = result.getStartTime() != null ? result.getStartTime() : System.currentTimeMillis();
        jobMapper.updateRunStats(jobId, lastStartDate,
                job.getRunCount() != null ? job.getRunCount() : 0,
                job.getFailureCount() != null ? job.getFailureCount() : 0,
                cumulativeRetryCount);

        // Calculate duration
        String duration = null;
        if (result.getStartTime() != null && result.getEndTime() != null) {
            long durationMs = result.getEndTime() - result.getStartTime();
            duration = formatDuration(durationMs);
        }

        if (result.getTaskId() != null) {
            try {
                Long logId = Long.parseLong(result.getTaskId());
                JobRunLogVO originalLog = jobRunLogMapper.findById(logId);
                if (originalLog == null) {
                    log.warn("Original log not found for logId: {}", logId);
                    return;
                }

                if (retryAttempt == 0) {
                    // First attempt (0): Update the original log entry
                    jobRunLogMapper.updateRetryStatus(
                            logId,
                            "RETRY",
                            "RETRY",
                            retryAttempt,
                            result.getStartTime(),
                            result.getEndTime(),
                            duration,
                            result.getError(),
                            result.getErrorCode(),
                            result.getOutput()
                    );
                } else {
                    // Subsequent attempts (1+): INSERT new log entry
                    // Get base job name (strip any existing retry suffix)
                    String baseJobName = originalLog.getJobName();
                    if (baseJobName.contains(" (Retry ")) {
                        baseJobName = baseJobName.substring(0, baseJobName.indexOf(" (Retry "));
                    }

                    JobRunLogVO retryLog = JobRunLogVO.builder()
                            .jobId(originalLog.getJobId())
                            .jobName(baseJobName)  // Keep original job name
                            .systemId(originalLog.getSystemId())
                            .systemName(originalLog.getSystemName())
                            .groupId(originalLog.getGroupId())
                            .groupName(originalLog.getGroupName())
                            .celeryTaskName(result.getTaskId() + "_retry_" + retryAttempt)
                            .batchType(originalLog.getBatchType())
                            .operation("RETRY")
                            .status("RETRY")
                            .actualStartDate(result.getStartTime())
                            .actualEndDate(result.getEndTime())
                            .reqStartDate(originalLog.getReqStartDate())
                            .runDuration(duration)
                            .retryCount(retryAttempt)  // This is the attempt number (0, 1, 2, ...)
                            .workflowRunId(originalLog.getWorkflowRunId())
                            .workflowPriority(originalLog.getWorkflowPriority())
                            .errors(result.getError())
                            .errorNo(result.getErrorCode())
                            .output(result.getOutput())
                            .userName(originalLog.getUserName())
                            .build();
                    jobRunLogMapper.insert(retryLog);
                    log.info("Created retry log entry for job {} attempt {}, new logId={}",
                            jobId, retryAttempt, retryLog.getLogId());
                }
            } catch (NumberFormatException e) {
                log.warn("Invalid task ID format: {}", result.getTaskId());
            }
        }

        log.info("Job {} attempt {} failed, will retry. Error: {}",
                jobId, retryAttempt, result.getError());
    }

    /**
     * Update run log entry based on result
     */
    private void updateRunLog(JobResult result, TaskStatus status) {
        if (result.getTaskId() == null) {
            return;
        }

        try {
            Long logId = Long.parseLong(result.getTaskId());
            int retryAttempt = result.getRetryAttempt() != null ? result.getRetryAttempt() : 0;

            if (status == TaskStatus.RUNNING) {
                // Update log to RUNNING with actual_start_date so diagram shows real-time status
                jobRunLogMapper.updateStatus(
                        logId, "RUNNING", "RUN",
                        result.getStartTime(),
                        null, null, null, null, null
                );
            } else {
                // Calculate duration
                String duration = null;
                if (result.getStartTime() != null && result.getEndTime() != null) {
                    long durationMs = result.getEndTime() - result.getStartTime();
                    duration = formatDuration(durationMs);
                }

                // Map status to log status and operation
                String logStatus = switch (status) {
                    case SUCCESS -> "SUCCESS";
                    case FAILED -> "FAILURE";
                    case TIMEOUT -> "TIMEOUT";
                    case CANCELLED -> "REVOKED";
                    default -> status.name();
                };

                // Determine operation type based on status
                String operation = switch (status) {
                    case SUCCESS -> "COMPLETED";
                    case FAILED, TIMEOUT -> "BROKEN";
                    case CANCELLED -> "REVOKED";
                    default -> "RUN";
                };

                if (retryAttempt == 0) {
                    // First attempt: Update the original log entry
                    jobRunLogMapper.updateStatus(
                            logId,
                            logStatus,
                            operation,
                            null,
                            result.getEndTime(),
                            duration,
                            result.getError(),
                            result.getErrorCode(),
                            result.getOutput()
                    );
                } else {
                    // Subsequent attempts: INSERT new log entry for this final attempt
                    JobRunLogVO originalLog = jobRunLogMapper.findById(logId);
                    if (originalLog != null) {
                        // Get base job name (strip any existing retry suffix)
                        String baseJobName = originalLog.getJobName();
                        if (baseJobName.contains(" (Retry ")) {
                            baseJobName = baseJobName.substring(0, baseJobName.indexOf(" (Retry "));
                        }

                        JobRunLogVO finalLog = JobRunLogVO.builder()
                                .jobId(originalLog.getJobId())
                                .jobName(baseJobName)  // Keep original job name
                                .systemId(originalLog.getSystemId())
                                .systemName(originalLog.getSystemName())
                                .groupId(originalLog.getGroupId())
                                .groupName(originalLog.getGroupName())
                                .celeryTaskName(result.getTaskId() + "_retry_" + retryAttempt)
                                .batchType(originalLog.getBatchType())
                                .operation(operation)
                                .status(logStatus)
                                .actualStartDate(result.getStartTime())
                                .actualEndDate(result.getEndTime())
                                .reqStartDate(originalLog.getReqStartDate())
                                .runDuration(duration)
                                .retryCount(retryAttempt)  // Attempt number (0, 1, 2, ..., 9)
                                .workflowRunId(originalLog.getWorkflowRunId())
                                .workflowPriority(originalLog.getWorkflowPriority())
                                .errors(result.getError())
                                .errorNo(result.getErrorCode())
                                .output(result.getOutput())
                                .userName(originalLog.getUserName())
                                .build();
                        jobRunLogMapper.insert(finalLog);
                        log.info("Created final log entry for job {} attempt {} with status {}, new logId={}",
                                originalLog.getJobId(), retryAttempt, logStatus, finalLog.getLogId());
                    }
                }
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid task ID format: {}", result.getTaskId());
        }
    }

    private String formatDuration(long durationMs) {
        long seconds = durationMs / 1000;
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }
}
