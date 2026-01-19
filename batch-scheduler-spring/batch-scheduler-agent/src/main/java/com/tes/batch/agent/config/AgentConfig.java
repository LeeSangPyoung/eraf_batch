package com.tes.batch.agent.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "agent")
public class AgentConfig {

    private String queueName;
    private String serverId;
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
        private String threadNamePrefix = "job-executor-";
    }
}
