package com.tes.batch.scheduler.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Listens for workflow execution results from Agent via Redis List (BRPOP)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowResultListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final WorkflowExecutionService workflowExecutionService;
    private final ObjectMapper objectMapper;

    private static final String RESULT_LIST_KEY = "workflow:result";
    private Thread consumerThread;

    @PostConstruct
    public void startListening() {
        consumerThread = new Thread(() -> {
            log.info("Started workflow result consumer on list: {}", RESULT_LIST_KEY);
            long backoffMs = 2000;
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Object message = redisTemplate.opsForList().rightPop(RESULT_LIST_KEY, 5, TimeUnit.SECONDS);
                    if (message != null) {
                        processMessage(message);
                    }
                    backoffMs = 2000; // [P8] reset on success
                } catch (Exception e) {
                    if (Thread.currentThread().isInterrupted()) {
                        break;
                    }
                    log.error("Error consuming workflow result, retrying in {}ms", backoffMs, e);
                    try {
                        Thread.sleep(backoffMs);
                        backoffMs = Math.min(backoffMs * 2, 30000); // [P8] exponential backoff, max 30s
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
            log.info("Workflow result consumer stopped");
        }, "workflow-result-consumer");
        consumerThread.setDaemon(true);
        consumerThread.start();
    }

    @PreDestroy
    public void stopListening() {
        if (consumerThread != null) {
            consumerThread.interrupt();
            log.info("Workflow result consumer shutdown requested");
        }
    }

    private void processMessage(Object message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resultMap = objectMapper.convertValue(message, Map.class);

            String workflowId = (String) resultMap.get("workflowId");
            Long workflowRunId = resultMap.get("workflowRunId") != null
                    ? ((Number) resultMap.get("workflowRunId")).longValue()
                    : null;
            String status = (String) resultMap.get("status");
            String errorMessage = (String) resultMap.get("errorMessage");
            Long startTime = resultMap.get("startTime") != null
                    ? ((Number) resultMap.get("startTime")).longValue()
                    : null;
            Long endTime = resultMap.get("endTime") != null
                    ? ((Number) resultMap.get("endTime")).longValue()
                    : null;
            Long durationMs = resultMap.get("durationMs") != null
                    ? ((Number) resultMap.get("durationMs")).longValue()
                    : null;

            if (workflowRunId != null) {
                log.debug("Received workflow result: workflowId={}, runId={}, status={}",
                        workflowId, workflowRunId, status);
                workflowExecutionService.handleWorkflowResult(
                        workflowId, workflowRunId, status, errorMessage, startTime, endTime, durationMs
                );
            } else {
                log.warn("Received workflow result without workflowRunId");
            }

        } catch (Exception e) {
            log.error("Failed to process workflow result message", e);
        }
    }
}
