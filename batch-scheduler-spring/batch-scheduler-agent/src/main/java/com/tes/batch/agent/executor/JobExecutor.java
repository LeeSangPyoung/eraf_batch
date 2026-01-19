package com.tes.batch.agent.executor;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.JobResult;
import com.tes.batch.common.enums.JobType;
import com.tes.batch.common.enums.TaskStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Main job executor that delegates to specific executors based on job type
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobExecutor {

    private final RestApiExecutor restApiExecutor;
    private final ExecutableExecutor executableExecutor;

    /**
     * Execute a job and return the result
     */
    public JobResult execute(JobMessage message) {
        log.info("Executing job: {} (type: {})", message.getJobId(), message.getJobType());

        long startTime = System.currentTimeMillis();

        try {
            String output;

            if (message.getJobType() == JobType.REST_API) {
                output = restApiExecutor.execute(message);
            } else if (message.getJobType() == JobType.EXECUTABLE) {
                output = executableExecutor.execute(message);
            } else {
                throw new IllegalArgumentException("Unknown job type: " + message.getJobType());
            }

            long endTime = System.currentTimeMillis();

            return JobResult.builder()
                    .jobId(message.getJobId())
                    .taskId(message.getTaskId())
                    .status(TaskStatus.SUCCESS)
                    .output(output)
                    .startTime(startTime)
                    .endTime(endTime)
                    .retryAttempt(message.getRetryCount())
                    .build();

        } catch (JobTimeoutException e) {
            log.error("Job timeout: {}", message.getJobId(), e);
            return JobResult.builder()
                    .jobId(message.getJobId())
                    .taskId(message.getTaskId())
                    .status(TaskStatus.TIMEOUT)
                    .error(e.getMessage())
                    .startTime(startTime)
                    .endTime(System.currentTimeMillis())
                    .retryAttempt(message.getRetryCount())
                    .build();

        } catch (Exception e) {
            log.error("Job execution failed: {}", message.getJobId(), e);
            return JobResult.builder()
                    .jobId(message.getJobId())
                    .taskId(message.getTaskId())
                    .status(TaskStatus.FAILED)
                    .error(e.getMessage())
                    .startTime(startTime)
                    .endTime(System.currentTimeMillis())
                    .retryAttempt(message.getRetryCount())
                    .build();
        }
    }

    /**
     * Parse duration string to Duration object
     * Supports formats: "01:00:00" (HH:MM:SS) or "3600" (seconds)
     */
    public static Duration parseDuration(String durationStr) {
        if (durationStr == null || durationStr.isEmpty()) {
            return Duration.ofHours(1); // Default 1 hour
        }

        try {
            if (durationStr.contains(":")) {
                // HH:MM:SS format
                String[] parts = durationStr.split(":");
                int hours = Integer.parseInt(parts[0]);
                int minutes = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
                int seconds = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
                return Duration.ofHours(hours).plusMinutes(minutes).plusSeconds(seconds);
            } else {
                // Seconds format
                return Duration.ofSeconds(Long.parseLong(durationStr));
            }
        } catch (Exception e) {
            log.warn("Failed to parse duration: {}, using default 1 hour", durationStr);
            return Duration.ofHours(1);
        }
    }
}
