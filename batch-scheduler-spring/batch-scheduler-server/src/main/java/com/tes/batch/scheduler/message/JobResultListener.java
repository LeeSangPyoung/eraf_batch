package com.tes.batch.scheduler.message;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.common.dto.JobResult;
import com.tes.batch.common.enums.TaskStatus;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listens for job results from Agents via Redis
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobResultListener implements MessageListener {

    private final RedisMessageListenerContainer listenerContainer;
    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final ObjectMapper objectMapper;

    private static final String RESULT_CHANNEL = "job:result";

    @PostConstruct
    public void subscribe() {
        listenerContainer.addMessageListener(this, new ChannelTopic(RESULT_CHANNEL));
        log.info("Subscribed to job result channel: {}", RESULT_CHANNEL);
    }

    @Override
    @Transactional
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.info("Received job result: {}", body);

            JobResult result = objectMapper.readValue(body, JobResult.class);
            processResult(result);

        } catch (Exception e) {
            log.error("Failed to process job result", e);
        }
    }

    private void processResult(JobResult result) {
        String jobId = result.getJobId();
        TaskStatus status = result.getStatus();

        // Update job state
        String newState;
        if (status == TaskStatus.RUNNING) {
            newState = "RUNNING";
        } else if (status == TaskStatus.SUCCESS) {
            newState = "SCHEDULED";
        } else {
            newState = "BROKEN";
        }

        // Get current job
        JobVO job = jobMapper.findById(jobId);
        if (job == null) {
            log.warn("Job not found for result: {}", jobId);
            return;
        }

        // Update job stats
        int runCount = job.getRunCount() != null ? job.getRunCount() : 0;
        int failureCount = job.getFailureCount() != null ? job.getFailureCount() : 0;

        if (status == TaskStatus.SUCCESS) {
            runCount++;
        } else if (status == TaskStatus.FAILED || status == TaskStatus.TIMEOUT) {
            failureCount++;
        }

        // Don't update last_start_date here - it's already set by SchedulerService when job is triggered
        // Only update run_count, failure_count, and retry_count
        jobMapper.updateRunStats(jobId, null, runCount, failureCount, result.getRetryAttempt());

        // Update job state (only if not running)
        if (status != TaskStatus.RUNNING) {
            jobMapper.updateState(jobId, newState, job.getNextRunDate());
        }

        // Update run log
        if (result.getTaskId() != null && status != TaskStatus.RUNNING) {
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

            // Parse error code if present
            Integer errorNo = result.getErrorCode();

            // Find and update the log entry
            try {
                Long logId = Long.parseLong(result.getTaskId());
                jobRunLogMapper.updateStatus(
                        logId,
                        logStatus,
                        operation,
                        result.getEndTime(),
                        duration,
                        result.getError(),
                        errorNo,
                        result.getOutput()
                );
            } catch (NumberFormatException e) {
                log.warn("Invalid task ID format: {}", result.getTaskId());
            }
        }

        log.info("Processed job result: {} - {}", jobId, status);
    }

    private String formatDuration(long durationMs) {
        long seconds = durationMs / 1000;
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }
}
