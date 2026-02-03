package com.tes.batch.agent.health;

import com.tes.batch.agent.config.AgentConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator for Agent status
 */
@Component
@RequiredArgsConstructor
public class AgentHealthEndpoint implements HealthIndicator {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AgentConfig agentConfig;

    @Override
    public Health health() {
        try {
            // Check Redis connection
            redisTemplate.opsForValue().get("health-check");

            return Health.up()
                    .withDetail("agent", "running")
                    .withDetail("serverId", agentConfig.getServerId())
                    .withDetail("queueName", agentConfig.getQueueName())
                    .withDetail("redisConnection", "connected")
                    .build();

        } catch (Exception e) {
            return Health.down()
                    .withDetail("agent", "error")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
