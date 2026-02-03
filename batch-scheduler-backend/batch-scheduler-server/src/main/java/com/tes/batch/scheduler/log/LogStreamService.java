package com.tes.batch.scheduler.log;

import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing real-time log streaming via SSE
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogStreamService {

    private final RedisMessageListenerContainer redisMessageListenerContainer;
    private final StringRedisTemplate redisTemplate;
    private final JobRunLogMapper jobRunLogMapper;

    private static final String LOG_CHANNEL_PREFIX = "job:log:";
    private static final String LOG_BUFFER_PREFIX = "job:log:buffer:";
    private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 minutes

    // Store active emitters and their listeners for cleanup
    private final Map<SseEmitter, MessageListener> emitterListeners = new ConcurrentHashMap<>();

    /**
     * Create SSE emitter and subscribe to Redis channel for the task
     */
    public SseEmitter createEmitter(String taskId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        String channel = LOG_CHANNEL_PREFIX + taskId;

        // Create message listener
        MessageListener listener = (message, pattern) -> {
            try {
                String logLine = new String(message.getBody());
                emitter.send(SseEmitter.event()
                        .name("log")
                        .data(logLine));

                // Check for end marker
                if (logLine.contains("[END]")) {
                    emitter.complete();
                }
            } catch (IOException e) {
                // Client disconnected - this is normal, don't log as error
                log.debug("SSE client disconnected: {}", e.getMessage());
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // Ignore completion errors
                }
            } catch (IllegalStateException e) {
                // Emitter already completed - ignore
                log.debug("SSE emitter already completed: {}", e.getMessage());
            }
        };

        // Subscribe to Redis channel
        redisMessageListenerContainer.addMessageListener(listener, new ChannelTopic(channel));
        emitterListeners.put(emitter, listener);

        // Send initial connection message
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connected to log stream for task: " + taskId));

            // Send buffered logs (for late subscribers)
            String bufferKey = LOG_BUFFER_PREFIX + taskId;
            List<String> bufferedLogs = redisTemplate.opsForList().range(bufferKey, 0, -1);
            if (bufferedLogs != null && !bufferedLogs.isEmpty()) {
                log.debug("Sending {} buffered logs for taskId: {}", bufferedLogs.size(), taskId);
                for (String logLine : bufferedLogs) {
                    emitter.send(SseEmitter.event()
                            .name("log")
                            .data(logLine));
                    // Check for end marker
                    if (logLine.contains("[END]")) {
                        emitter.complete();
                        return emitter;
                    }
                }
            } else {
                // Fallback: if Redis buffer is empty, try to load from database
                log.debug("Redis buffer empty for taskId: {}, trying database fallback", taskId);
                String storedLogs = getStoredLogs(taskId);
                if (storedLogs != null && !storedLogs.startsWith("No logs found")) {
                    // Send stored logs line by line
                    String[] lines = storedLogs.split("\n");
                    for (String line : lines) {
                        if (!line.isEmpty()) {
                            emitter.send(SseEmitter.event()
                                    .name("log")
                                    .data(line));
                        }
                    }
                    emitter.send(SseEmitter.event()
                            .name("log")
                            .data("[END]"));
                    emitter.complete();
                    return emitter;
                }
            }
        } catch (IOException e) {
            // Client disconnected during initial send - normal behavior
            log.debug("Client disconnected during initial SSE setup: {}", e.getMessage());
        } catch (IllegalStateException e) {
            // Emitter already completed
            log.debug("SSE emitter completed during setup: {}", e.getMessage());
        }

        // Cleanup on completion/timeout/error
        Runnable cleanup = () -> {
            MessageListener l = emitterListeners.remove(emitter);
            if (l != null) {
                redisMessageListenerContainer.removeMessageListener(l, new ChannelTopic(channel));
            }
            log.debug("Cleaned up SSE emitter for taskId: {}", taskId);
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> {
            log.debug("SSE error for taskId {}: {}", taskId, e.getMessage());
            cleanup.run();
        });

        log.debug("Created SSE emitter for taskId: {}, channel: {}", taskId, channel);
        return emitter;
    }

    /**
     * Get stored logs from database for completed tasks
     * @param logId The log ID (used as taskId in job messages)
     */
    public String getStoredLogs(String logId) {
        try {
            Long id = Long.parseLong(logId);
            JobRunLogVO logVO = jobRunLogMapper.findById(id);
            if (logVO != null && logVO.getOutput() != null) {
                return logVO.getOutput();
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid logId format: {}", logId);
        }
        return "No logs found for log: " + logId;
    }

    /**
     * Get buffered logs from Redis for recently completed tasks
     * This provides formatted logs with timestamps for jobs that completed within 24 hours
     * @param taskId The task ID
     * @return List of formatted log lines, or null if buffer expired
     */
    public List<String> getBufferedLogs(String taskId) {
        String bufferKey = LOG_BUFFER_PREFIX + taskId;
        try {
            List<String> bufferedLogs = redisTemplate.opsForList().range(bufferKey, 0, -1);
            if (bufferedLogs != null && !bufferedLogs.isEmpty()) {
                log.debug("Retrieved {} buffered logs for taskId: {}", bufferedLogs.size(), taskId);
                return bufferedLogs;
            }
        } catch (Exception e) {
            log.warn("Failed to get buffered logs from Redis: {}", e.getMessage());
        }
        return null;
    }
}
