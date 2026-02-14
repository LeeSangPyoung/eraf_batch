package com.tes.batch.agent.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.common.dto.WorkflowMessage;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Listens for workflow messages from Redis List (BRPOP) and delegates to AsyncWorkflowRunner
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowMessageListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AgentConfig agentConfig;
    private final ObjectMapper objectMapper;
    private final AsyncWorkflowRunner asyncWorkflowRunner;

    private Thread consumerThread;
    private volatile boolean running = true;

    @PostConstruct
    public void startListening() {
        String listKey = "workflow:queue:" + agentConfig.getQueueName();

        consumerThread = new Thread(() -> {
            log.info("Started workflow queue consumer on list: {}", listKey);
            long backoffMs = 2000;
            while (running && !Thread.currentThread().isInterrupted()) {
                try {
                    Object message = redisTemplate.opsForList().rightPop(listKey, 5, TimeUnit.SECONDS);
                    if (message != null) {
                        try {
                            WorkflowMessage workflowMessage = objectMapper.convertValue(message, WorkflowMessage.class);
                            log.info("Received workflow message: workflowId={}, runId={}",
                                    workflowMessage.getWorkflowId(), workflowMessage.getWorkflowRunId());
                            asyncWorkflowRunner.executeWorkflowAsync(workflowMessage);
                        } catch (Exception processingError) {
                            log.error("Failed to process workflow message, sending to dead-letter queue", processingError);
                            try {
                                redisTemplate.opsForList().leftPush(listKey + ":dead-letter", message);
                            } catch (Exception dlqError) {
                                log.error("Failed to send to dead-letter queue", dlqError);
                            }
                        }
                    }
                    backoffMs = 2000;
                } catch (Exception e) {
                    if (!running || Thread.currentThread().isInterrupted()) {
                        break;
                    }
                    log.error("Error consuming workflow queue, retrying in {}ms", backoffMs, e);
                    try {
                        Thread.sleep(backoffMs);
                        backoffMs = Math.min(backoffMs * 2, 30000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
            log.info("Workflow queue consumer stopped");
        }, "workflow-queue-consumer");
        consumerThread.setDaemon(false);
        consumerThread.start();
    }

    @PreDestroy
    public void stopListening() {
        running = false;
        if (consumerThread != null) {
            consumerThread.interrupt();
            try {
                consumerThread.join(30000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            log.info("Workflow queue consumer shutdown completed");
        }
    }
}
