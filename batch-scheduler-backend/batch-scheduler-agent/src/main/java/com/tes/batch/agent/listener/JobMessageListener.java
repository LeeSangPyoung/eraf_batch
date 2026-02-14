package com.tes.batch.agent.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.common.dto.JobMessage;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Listens for job messages from Redis List (BRPOP) and delegates to AsyncJobRunner
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobMessageListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AgentConfig agentConfig;
    private final ObjectMapper objectMapper;
    private final AsyncJobRunner asyncJobRunner;

    private Thread consumerThread;
    private volatile boolean running = true;

    @PostConstruct
    public void startListening() {
        String listKey = "job:queue:" + agentConfig.getQueueName();

        consumerThread = new Thread(() -> {
            log.info("Started job queue consumer on list: {}", listKey);
            long backoffMs = 2000;
            while (running && !Thread.currentThread().isInterrupted()) {
                try {
                    Object message = redisTemplate.opsForList().rightPop(listKey, 5, TimeUnit.SECONDS);
                    if (message != null) {
                        try {
                            JobMessage jobMessage = objectMapper.convertValue(message, JobMessage.class);
                            log.info("Received job message: jobId={}", jobMessage.getJobId());
                            asyncJobRunner.executeJobAsync(jobMessage);
                        } catch (Exception processingError) {
                            log.error("Failed to process job message, sending to dead-letter queue", processingError);
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
                    log.error("Error consuming job queue, retrying in {}ms", backoffMs, e);
                    try {
                        Thread.sleep(backoffMs);
                        backoffMs = Math.min(backoffMs * 2, 30000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
            log.info("Job queue consumer stopped");
        }, "job-queue-consumer");
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
            log.info("Job queue consumer shutdown completed");
        }
    }
}
