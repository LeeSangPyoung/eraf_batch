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

    private static final String RESULT_CHANNEL = "job:result";

    /**
     * Report job execution result to Scheduler
     */
    public void reportResult(JobResult result) {
        try {
            redisTemplate.convertAndSend(RESULT_CHANNEL, result);
            log.info("Reported job result: {} - {}", result.getJobId(), result.getStatus());
        } catch (Exception e) {
            log.error("Failed to report job result: {}", result.getJobId(), e);
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
     * Report workflow execution result (simple)
     */
    public void reportWorkflowResult(Long workflowRunId, String status, String errorMessage) {
        try {
            String channel = "workflow:result";
            java.util.Map<String, Object> message = java.util.Map.of(
                    "workflowRunId", workflowRunId,
                    "status", status,
                    "errorMessage", errorMessage != null ? errorMessage : "",
                    "endTime", System.currentTimeMillis()
            );
            redisTemplate.convertAndSend(channel, message);
            log.info("Reported workflow result: {} - {}", workflowRunId, status);
        } catch (Exception e) {
            log.error("Failed to report workflow result: {}", workflowRunId, e);
        }
    }

    /**
     * Report workflow execution result (detailed)
     */
    public void reportWorkflowResult(String workflowId, Long workflowRunId,
                                      com.tes.batch.common.enums.TaskStatus status,
                                      String errorMessage, long startTime, long endTime) {
        try {
            String channel = "workflow:result";
            java.util.Map<String, Object> message = new java.util.HashMap<>();
            message.put("workflowId", workflowId);
            message.put("workflowRunId", workflowRunId);
            message.put("status", status.name());
            message.put("errorMessage", errorMessage != null ? errorMessage : "");
            message.put("startTime", startTime);
            message.put("endTime", endTime);
            message.put("durationMs", endTime - startTime);

            redisTemplate.convertAndSend(channel, message);
            log.info("Reported workflow result: {} (runId: {}) - {}", workflowId, workflowRunId, status);
        } catch (Exception e) {
            log.error("Failed to report workflow result: {} (runId: {})", workflowId, workflowRunId, e);
        }
    }
}
