package com.tes.batch.agent.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.agent.config.AgentConfig;
import com.tes.batch.agent.executor.WorkflowExecutor;
import com.tes.batch.common.dto.WorkflowMessage;
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
 * Listens for workflow messages from Redis and executes them
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowMessageListener implements MessageListener {

    private final RedisMessageListenerContainer listenerContainer;
    private final AgentConfig agentConfig;
    private final WorkflowExecutor workflowExecutor;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void subscribe() {
        String channel = "workflow:queue:" + agentConfig.getQueueName();
        listenerContainer.addMessageListener(this, new ChannelTopic(channel));
        log.info("Subscribed to workflow queue: {}", channel);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.info("Received workflow message: {}", body);

            WorkflowMessage workflowMessage = objectMapper.readValue(body, WorkflowMessage.class);
            executeWorkflowAsync(workflowMessage);

        } catch (Exception e) {
            log.error("Failed to process workflow message", e);
        }
    }

    @Async("jobExecutor")
    public void executeWorkflowAsync(WorkflowMessage workflowMessage) {
        log.info("Starting workflow execution: {} (runId: {})",
                workflowMessage.getWorkflowName(), workflowMessage.getWorkflowRunId());

        workflowExecutor.executeWorkflow(workflowMessage);
    }
}
