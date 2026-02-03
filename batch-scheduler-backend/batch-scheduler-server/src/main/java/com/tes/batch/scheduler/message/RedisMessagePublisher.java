package com.tes.batch.scheduler.message;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.WorkflowMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Publishes job messages to Redis for Agent consumption
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisMessagePublisher {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Publish job to specific queue
     */
    public void publishJob(String queueName, JobMessage message) {
        String channel = "job:queue:" + queueName;
        try {
            redisTemplate.convertAndSend(channel, message);
            log.info("Published job to {}: {}", channel, message.getJobId());
        } catch (Exception e) {
            log.error("Failed to publish job: {}", message.getJobId(), e);
            throw new RuntimeException("Failed to publish job to Redis", e);
        }
    }

    /**
     * Publish workflow to specific queue
     */
    public void publishWorkflow(String queueName, WorkflowMessage message) {
        String channel = "workflow:queue:" + queueName;
        try {
            redisTemplate.convertAndSend(channel, message);
            log.info("Published workflow to {}: {}", channel, message.getWorkflowId());
        } catch (Exception e) {
            log.error("Failed to publish workflow: {}", message.getWorkflowId(), e);
            throw new RuntimeException("Failed to publish workflow to Redis", e);
        }
    }

    /**
     * Check if agent is online for given queue
     */
    public boolean isAgentOnline(String queueName) {
        String healthKey = "agent:health:" + queueName;
        try {
            Object lastHeartbeat = redisTemplate.opsForValue().get(healthKey);
            if (lastHeartbeat == null) {
                return false;
            }

            long timestamp = ((Number) lastHeartbeat).longValue();
            long now = System.currentTimeMillis();

            // Consider agent online if heartbeat was within last 60 seconds
            return (now - timestamp) < 60000;

        } catch (Exception e) {
            log.warn("Failed to check agent status for queue: {}", queueName);
            return false;
        }
    }
}
