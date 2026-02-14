package com.tes.batch.agent.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "agent")
public class AgentConfig {

    private String queueName;
    private String serverId;

    /** [M6] Validate critical configuration on startup */
    @PostConstruct
    public void validate() {
        if (queueName == null || queueName.isBlank()) {
            throw new IllegalStateException("agent.queue-name must be configured");
        }
        if (executor.maxConcurrentJobs < 1 || executor.maxConcurrentJobs > 100) {
            throw new IllegalStateException("agent.executor.max-concurrent-jobs must be between 1 and 100");
        }
        if (executor.corePoolSize < 1) {
            throw new IllegalStateException("agent.executor.core-pool-size must be at least 1");
        }
        log.info("Agent config validated: queue={}, maxConcurrentJobs={}", queueName, executor.maxConcurrentJobs);
    }
    private Heartbeat heartbeat = new Heartbeat();
    private Executor executor = new Executor();

    @Data
    public static class Heartbeat {
        private long interval = 10000;
        private long timeout = 60000;
    }

    @Data
    public static class Executor {
        private int corePoolSize = 5;
        private int maxPoolSize = 20;
        private int queueCapacity = 100;
        private int maxConcurrentJobs = 10;
        private String threadNamePrefix = "job-executor-";
    }
}
