package com.tes.batch.agent.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.agent.executor.JobExecutor;
import com.tes.batch.agent.state.TaskStateReporter;
import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.JobResult;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for job messages from Redis and executes them
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobMessageListener implements MessageListener {

    private final RedisMessageListenerContainer listenerContainer;
    private final AgentConfig agentConfig;
    private final JobExecutor jobExecutor;
    private final TaskStateReporter stateReporter;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void subscribe() {
        String channel = "job:queue:" + agentConfig.getQueueName();
        listenerContainer.addMessageListener(this, new ChannelTopic(channel));
        log.info("Subscribed to job queue: {}", channel);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.info("Received job message: {}", body);

            JobMessage jobMessage = objectMapper.readValue(body, JobMessage.class);
            executeJobAsync(jobMessage);

        } catch (Exception e) {
            log.error("Failed to process job message", e);
        }
    }

    @Async("jobExecutor")
    public void executeJobAsync(JobMessage jobMessage) {
        log.info("Starting job execution: {}", jobMessage.jobId());

        try {
            // Report job started
            stateReporter.reportStarted(jobMessage.jobId(), jobMessage.taskId());

            // Execute job
            JobResult result = jobExecutor.execute(jobMessage);

            // Report result
            stateReporter.reportResult(result);

        } catch (Exception e) {
            log.error("Job execution failed: {}", jobMessage.jobId(), e);

            // Report failure
            JobResult failResult = JobResult.builder()
                    .jobId(jobMessage.jobId())
                    .taskId(jobMessage.taskId())
                    .status(com.tes.batch.common.enums.TaskStatus.FAILED)
                    .error(e.getMessage())
                    .endTime(System.currentTimeMillis())
                    .build();
            stateReporter.reportResult(failResult);
        }
    }
}
