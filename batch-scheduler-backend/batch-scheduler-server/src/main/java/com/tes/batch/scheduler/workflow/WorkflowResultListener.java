package com.tes.batch.scheduler.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens for workflow execution results from Agent via Redis
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowResultListener implements MessageListener {

    private final RedisMessageListenerContainer listenerContainer;
    private final WorkflowExecutionService workflowExecutionService;
    private final ObjectMapper objectMapper;

    private static final String RESULT_CHANNEL = "workflow:result";

    @PostConstruct
    public void subscribe() {
        listenerContainer.addMessageListener(this, new ChannelTopic(RESULT_CHANNEL));
        log.info("Subscribed to workflow result channel: {}", RESULT_CHANNEL);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody());
            log.debug("Received workflow result message: {}", body);

            @SuppressWarnings("unchecked")
            Map<String, Object> resultMap = objectMapper.readValue(body, Map.class);

            String workflowId = (String) resultMap.get("workflowId");
            Long workflowRunId = resultMap.get("workflowRunId") != null
                    ? ((Number) resultMap.get("workflowRunId")).longValue()
                    : null;
            String status = (String) resultMap.get("status");
            String errorMessage = (String) resultMap.get("errorMessage");
            Long startTime = resultMap.get("startTime") != null
                    ? ((Number) resultMap.get("startTime")).longValue()
                    : null;
            Long endTime = resultMap.get("endTime") != null
                    ? ((Number) resultMap.get("endTime")).longValue()
                    : null;
            Long durationMs = resultMap.get("durationMs") != null
                    ? ((Number) resultMap.get("durationMs")).longValue()
                    : null;

            if (workflowRunId != null) {
                workflowExecutionService.handleWorkflowResult(
                        workflowId, workflowRunId, status, errorMessage, startTime, endTime, durationMs
                );
            } else {
                log.warn("Received workflow result without workflowRunId");
            }

        } catch (Exception e) {
            log.error("Failed to process workflow result message", e);
        }
    }
}
