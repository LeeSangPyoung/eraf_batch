package com.tes.batch.agent.listener;

import com.tes.batch.agent.config.ConcurrencyManager;
import com.tes.batch.agent.executor.JobExecutor;
import com.tes.batch.agent.state.TaskStateReporter;
import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.JobResult;
import com.tes.batch.common.enums.TaskStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Separate bean for async job execution to avoid Spring @Async self-invocation issue.
 * When @Async is called from within the same class, Spring AOP proxy is bypassed
 * and the method runs synchronously. This class ensures proper async execution.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncJobRunner {

    private final JobExecutor jobExecutor;
    private final TaskStateReporter stateReporter;
    private final ConcurrencyManager concurrencyManager;

    @Async("jobTaskExecutor")
    public void executeJobAsync(JobMessage jobMessage) {
        try {
            concurrencyManager.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Job {} interrupted while waiting for concurrency permit", jobMessage.getJobId());
            return;
        }
        try {
            log.info("Starting job execution: {} (active: {}/{})", jobMessage.getJobId(),
                    concurrencyManager.getActiveJobCount(),
                    concurrencyManager.getActiveJobCount() + concurrencyManager.getAvailablePermits());

            int maxAttempts = jobMessage.getRetryCount() != null ? jobMessage.getRetryCount() : 1;
            if (maxAttempts < 1) maxAttempts = 1;
            int retryDelaySeconds = jobMessage.getRetryDelay() != null ? jobMessage.getRetryDelay() : 0;

            stateReporter.reportStarted(jobMessage.getJobId(), jobMessage.getTaskId());

            JobResult lastResult = null;

            for (int attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    if (attempt > 0) {
                        log.info("Retry attempt {}/{} for job {} after {}s delay",
                                attempt, maxAttempts - 1, jobMessage.getJobId(), retryDelaySeconds);
                    }

                    JobResult result = jobExecutor.execute(jobMessage);
                    result.setRetryAttempt(attempt);
                    lastResult = result;

                    if (result.getStatus() == TaskStatus.SUCCESS) {
                        log.info("Job {} succeeded on attempt {}", jobMessage.getJobId(), attempt);
                        stateReporter.reportResult(result);
                        return;
                    }

                    if (attempt < maxAttempts - 1) {
                        log.warn("Job {} failed on attempt {}/{}, will retry in {}s. Error: {}",
                                jobMessage.getJobId(), attempt, maxAttempts - 1, retryDelaySeconds,
                                result.getError() != null ? result.getError() : "Unknown error");

                        result.setStatus(TaskStatus.RETRY);
                        stateReporter.reportResult(result);

                        if (retryDelaySeconds > 0) {
                            Thread.sleep(retryDelaySeconds * 1000L);
                        }
                    } else {
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
                        reportFailure(jobMessage, attempt, e.getMessage());
                        return;
                    }

                    reportRetry(jobMessage, attempt, e.getMessage());

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

            if (lastResult != null) {
                stateReporter.reportResult(lastResult);
            }
        } finally {
            concurrencyManager.release();
        }
    }

    private void reportFailure(JobMessage jobMessage, int retryAttempt, String errorMessage) {
        JobResult failResult = JobResult.builder()
                .jobId(jobMessage.getJobId())
                .taskId(jobMessage.getTaskId())
                .status(TaskStatus.FAILED)
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
                .status(TaskStatus.RETRY)
                .error(errorMessage)
                .endTime(System.currentTimeMillis())
                .retryAttempt(retryAttempt)
                .build();
        stateReporter.reportResult(retryResult);
    }
}
