package com.tes.batch.agent.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.agent.executor.JobExecutor;
import com.tes.batch.agent.state.TaskStateReporter;
import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.JobResult;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for job messages from Redis and executes them
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobMessageListener implements MessageListener {

    private final RedisMessageListenerContainer listenerContainer;
    private final AgentConfig agentConfig;
    private final JobExecutor jobExecutor;
    private final TaskStateReporter stateReporter;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void subscribe() {
        String channel = "job:queue:" + agentConfig.getQueueName();
        listenerContainer.addMessageListener(this, new ChannelTopic(channel));
        log.info("Subscribed to job queue: {}", channel);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.info("Received job message: {}", body);

            JobMessage jobMessage = objectMapper.readValue(body, JobMessage.class);
            executeJobAsync(jobMessage);

        } catch (Exception e) {
            log.error("Failed to process job message", e);
        }
    }

    @Async("jobExecutor")
    public void executeJobAsync(JobMessage jobMessage) {
        log.info("Starting job execution: {}", jobMessage.getJobId());

        // Get retry settings: maxAttempts is the total number of attempts (including first try)
        // If maxAttempts=0 or 1, run once. If maxAttempts=10, run up to 10 times (attempts 0-9).
        int maxAttempts = jobMessage.getRetryCount() != null ? jobMessage.getRetryCount() : 1;
        if (maxAttempts < 1) maxAttempts = 1;  // At least one attempt
        int retryDelaySeconds = jobMessage.getRetryDelay() != null ? jobMessage.getRetryDelay() : 0;

        // Report job started (only once at the beginning)
        stateReporter.reportStarted(jobMessage.getJobId(), jobMessage.getTaskId());

        JobResult lastResult = null;

        // Loop from attempt 0 to maxAttempts-1 (total maxAttempts iterations)
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    log.info("Retry attempt {}/{} for job {} after {}s delay",
                            attempt, maxAttempts - 1, jobMessage.getJobId(), retryDelaySeconds);
                }

                // Execute job
                JobResult result = jobExecutor.execute(jobMessage);
                result.setRetryAttempt(attempt);  // Track actual retry attempt
                lastResult = result;

                // Success - report and return
                if (result.getStatus() == com.tes.batch.common.enums.TaskStatus.SUCCESS) {
                    log.info("Job {} succeeded on attempt {}", jobMessage.getJobId(), attempt);
                    stateReporter.reportResult(result);
                    return;
                }

                // Failed - check if we can retry (not last attempt)
                if (attempt < maxAttempts - 1) {
                    log.warn("Job {} failed on attempt {}/{}, will retry in {}s. Error: {}",
                            jobMessage.getJobId(), attempt, maxAttempts - 1, retryDelaySeconds,
                            result.getError() != null ? result.getError() : "Unknown error");

                    // Report this attempt as RETRY (will create log entry for this attempt)
                    result.setStatus(com.tes.batch.common.enums.TaskStatus.RETRY);
                    stateReporter.reportResult(result);

                    if (retryDelaySeconds > 0) {
                        Thread.sleep(retryDelaySeconds * 1000L);
                    }
                } else {
                    // No more retries - report final failure
                    log.error("Job {} failed after {} attempts. Final error: {}",
                            jobMessage.getJobId(), maxAttempts,
                            result.getError() != null ? result.getError() : "Unknown error");
                    stateReporter.reportResult(result);
                    return;
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Job {} interrupted during retry delay", jobMessage.getJobId());
                reportFailure(jobMessage, attempt, "Interrupted during retry: " + e.getMessage());
                return;
            } catch (Exception e) {
                log.error("Job {} execution error on attempt {}: {}",
                        jobMessage.getJobId(), attempt, e.getMessage());

                if (attempt >= maxAttempts - 1) {
                    // No more retries - report failure
                    reportFailure(jobMessage, attempt, e.getMessage());
                    return;
                }

                // Report this attempt as RETRY before waiting
                reportRetry(jobMessage, attempt, e.getMessage());

                // Wait before retry
                if (retryDelaySeconds > 0) {
                    try {
                        Thread.sleep(retryDelaySeconds * 1000L);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        reportFailure(jobMessage, attempt, "Interrupted: " + ie.getMessage());
                        return;
                    }
                }
            }
        }

        // Fallback - should not reach here, but report last result if available
        if (lastResult != null) {
            stateReporter.reportResult(lastResult);
        }
    }

    private void reportFailure(JobMessage jobMessage, int retryAttempt, String errorMessage) {
        JobResult failResult = JobResult.builder()
                .jobId(jobMessage.getJobId())
                .taskId(jobMessage.getTaskId())
                .status(com.tes.batch.common.enums.TaskStatus.FAILED)
                .error(errorMessage)
                .endTime(System.currentTimeMillis())
                .retryAttempt(retryAttempt)
                .build();
        stateReporter.reportResult(failResult);
    }

    private void reportRetry(JobMessage jobMessage, int retryAttempt, String errorMessage) {
        JobResult retryResult = JobResult.builder()
                .jobId(jobMessage.getJobId())
                .taskId(jobMessage.getTaskId())
                .status(com.tes.batch.common.enums.TaskStatus.RETRY)
                .error(errorMessage)
                .endTime(System.currentTimeMillis())
                .retryAttempt(retryAttempt)
                .build();
        stateReporter.reportResult(retryResult);
    }
}
