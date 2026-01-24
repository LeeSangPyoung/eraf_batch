package com.tes.batch.agent.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
@RequiredArgsConstructor
public class ExecutorConfig {

    private final AgentConfig agentConfig;

    @Bean(name = "taskExecutor")
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(agentConfig.getExecutor().getCorePoolSize());
        executor.setMaxPoolSize(agentConfig.getExecutor().getMaxPoolSize());
        executor.setQueueCapacity(agentConfig.getExecutor().getQueueCapacity());
        executor.setThreadNamePrefix(agentConfig.getExecutor().getThreadNamePrefix());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }

    @Bean
    public ExecutorService jobExecutorService() {
        return Executors.newFixedThreadPool(agentConfig.getExecutor().getMaxPoolSize());
    }
}
