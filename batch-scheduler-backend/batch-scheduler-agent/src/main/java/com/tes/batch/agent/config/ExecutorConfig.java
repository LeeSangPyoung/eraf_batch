package com.tes.batch.agent.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ExecutorConfig {

    private final AgentConfig agentConfig;
    private ExecutorService executorServiceRef;

    @Bean(name = "jobTaskExecutor")
    public ThreadPoolTaskExecutor jobTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(agentConfig.getExecutor().getCorePoolSize());
        executor.setMaxPoolSize(agentConfig.getExecutor().getMaxPoolSize());
        executor.setQueueCapacity(agentConfig.getExecutor().getQueueCapacity());
        executor.setThreadNamePrefix(agentConfig.getExecutor().getThreadNamePrefix());
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }

    @Bean
    public ExecutorService jobExecutorService() {
        executorServiceRef = Executors.newFixedThreadPool(agentConfig.getExecutor().getMaxPoolSize());
        return executorServiceRef;
    }

    @PreDestroy
    public void shutdownExecutorService() {
        if (executorServiceRef != null) {
            log.info("Shutting down jobExecutorService...");
            executorServiceRef.shutdown();
            try {
                if (!executorServiceRef.awaitTermination(60, TimeUnit.SECONDS)) {
                    executorServiceRef.shutdownNow();
                    log.warn("jobExecutorService forced shutdown");
                }
            } catch (InterruptedException e) {
                executorServiceRef.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 30000)
                .responseTimeout(Duration.ofMinutes(5))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(5, TimeUnit.MINUTES))
                                .addHandlerLast(new WriteTimeoutHandler(5, TimeUnit.MINUTES)));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }
}
