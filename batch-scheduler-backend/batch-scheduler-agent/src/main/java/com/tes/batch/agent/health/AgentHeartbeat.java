package com.tes.batch.agent.health;

import com.tes.batch.agent.config.AgentConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Sends periodic heartbeat to Redis for health monitoring
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentHeartbeat {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AgentConfig agentConfig;

    /**
     * Send heartbeat every 10 seconds (configurable)
     */
    @Scheduled(fixedRateString = "${agent.heartbeat.interval:10000}")
    public void sendHeartbeat() {
        try {
            String healthKey = "agent:health:" + agentConfig.getQueueName();
            long timestamp = System.currentTimeMillis();

            // Store timestamp in Redis with TTL
            redisTemplate.opsForValue().set(healthKey, timestamp,
                    agentConfig.getHeartbeat().getTimeout(), TimeUnit.MILLISECONDS);

            // Also store agent info
            String infoKey = "agent:info:" + agentConfig.getQueueName();
            java.util.Map<String, Object> agentInfo = java.util.Map.of(
                    "serverId", agentConfig.getServerId(),
                    "queueName", agentConfig.getQueueName(),
                    "lastHeartbeat", timestamp,
                    "status", "ONLINE"
            );
            redisTemplate.opsForHash().putAll(infoKey, agentInfo);
            redisTemplate.expire(infoKey, agentConfig.getHeartbeat().getTimeout(), TimeUnit.MILLISECONDS);

            log.debug("Heartbeat sent: {}", agentConfig.getQueueName());

        } catch (Exception e) {
            log.error("Failed to send heartbeat", e);
        }
    }
}
