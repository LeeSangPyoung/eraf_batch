package com.tes.batch.agent.state;

import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.common.dto.JobResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Reports task execution status back to the Scheduler via Redis
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskStateReporter {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AgentConfig agentConfig;

    private static final String RESULT_LIST_KEY = "job:result";

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 1000;

    /**
     * Report job execution result to Scheduler via Redis List (with retry)
     */
    public void reportResult(JobResult result) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                redisTemplate.opsForList().leftPush(RESULT_LIST_KEY, result);
                log.info("Reported job result: {} - {}", result.getJobId(), result.getStatus());
                return;
            } catch (Exception e) {
                if (attempt < MAX_RETRIES) {
                    log.warn("Failed to report job result (attempt {}/{}): {}", attempt, MAX_RETRIES, result.getJobId());
                    try { Thread.sleep(RETRY_DELAY_MS * attempt); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    log.error("Failed to report job result after {} attempts: {}", MAX_RETRIES, result.getJobId(), e);
                }
            }
        }
    }

    /**
     * Report job started
     */
    public void reportStarted(String jobId, String taskId) {
        JobResult result = JobResult.builder()
                .jobId(jobId)
                .taskId(taskId)
                .status(com.tes.batch.common.enums.TaskStatus.RUNNING)
                .startTime(System.currentTimeMillis())
                .build();
        reportResult(result);
    }

    /**
     * Report workflow execution result (simple, with retry)
     */
    public void reportWorkflowResult(Long workflowRunId, String status, String errorMessage) {
        String listKey = "workflow:result";
        java.util.Map<String, Object> message = java.util.Map.of(
                "workflowRunId", workflowRunId,
                "status", status,
                "errorMessage", errorMessage != null ? errorMessage : "",
                "endTime", System.currentTimeMillis()
        );
        pushWithRetry(listKey, message, "workflow " + workflowRunId);
    }

    /**
     * Report workflow execution result (detailed, with retry)
     */
    public void reportWorkflowResult(String workflowId, Long workflowRunId,
                                      com.tes.batch.common.enums.TaskStatus status,
                                      String errorMessage, long startTime, long endTime) {
        String listKey = "workflow:result";
        java.util.Map<String, Object> message = new java.util.HashMap<>();
        message.put("workflowId", workflowId);
        message.put("workflowRunId", workflowRunId);
        message.put("status", status.name());
        message.put("errorMessage", errorMessage != null ? errorMessage : "");
        message.put("startTime", startTime);
        message.put("endTime", endTime);
        message.put("durationMs", endTime - startTime);
        pushWithRetry(listKey, message, "workflow " + workflowId + " (runId: " + workflowRunId + ")");
    }

    /**
     * Push to Redis List with retry logic
     */
    private void pushWithRetry(String listKey, Object message, String description) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                redisTemplate.opsForList().leftPush(listKey, message);
                log.info("Reported result for {}", description);
                return;
            } catch (Exception e) {
                if (attempt < MAX_RETRIES) {
                    log.warn("Failed to report result (attempt {}/{}): {}", attempt, MAX_RETRIES, description);
                    try { Thread.sleep(RETRY_DELAY_MS * attempt); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    log.error("Failed to report result after {} attempts: {}", MAX_RETRIES, description, e);
                }
            }
        }
    }
}
