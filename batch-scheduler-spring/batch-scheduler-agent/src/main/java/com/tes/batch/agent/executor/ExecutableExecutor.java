package com.tes.batch.agent.executor;

import com.tes.batch.common.dto.JobMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Executor for EXECUTABLE type jobs (shell commands)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExecutableExecutor {

    private final StringRedisTemplate redisTemplate;
    private static final String LOG_CHANNEL_PREFIX = "job:log:";
    private static final String LOG_BUFFER_PREFIX = "job:log:buffer:";
    private static final int LOG_BUFFER_MAX_SIZE = 1000;  // Keep last 1000 lines
    private static final int LOG_BUFFER_TTL_HOURS = 24;   // Expire after 24 hours
    private static final int OUTPUT_SUMMARY_LINES = 10;   // Only save last N lines as output

    /**
     * Execute shell command with real-time log streaming
     *
     * @param message Job message containing command
     * @return Command output
     */
    public String execute(JobMessage message) {
        String command = message.getJobAction();
        String taskId = message.getTaskId();
        Duration timeout = message.getMaxDuration() != null ? message.getMaxDuration() : Duration.ofMinutes(5);
        String logChannel = LOG_CHANNEL_PREFIX + taskId;

        log.info("Executing command: {} (timeout: {}, logChannel: {})", command, timeout, logChannel);

        ProcessBuilder processBuilder = new ProcessBuilder();

        // Determine shell based on OS
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            processBuilder.command("cmd.exe", "/c", command);
        } else {
            processBuilder.command("sh", "-c", command);
        }

        processBuilder.redirectErrorStream(true);

        try {
            Process process = processBuilder.start();

            // Read output in a separate thread to prevent blocking
            StringBuilder output = new StringBuilder();
            Thread outputReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        // Append to output buffer
                        output.append(line).append("\n");
                        // Publish to Redis for real-time streaming
                        publishLog(logChannel, line);
                    }
                } catch (IOException e) {
                    log.error("Error reading process output", e);
                    publishLog(logChannel, "[ERROR] " + e.getMessage());
                }
            });
            outputReader.start();

            // Wait for process with timeout
            boolean completed = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);

            if (!completed) {
                process.destroyForcibly();
                publishLog(logChannel, "[END]");
                throw new JobTimeoutException("Command timed out after " + timeout);
            }

            // Wait for output reader to finish
            outputReader.join(5000);

            int exitCode = process.exitValue();
            String result = output.toString().trim();

            if (exitCode != 0) {
                log.warn("Command exited with code {}: {}", exitCode, command);
                publishLog(logChannel, "[END]");
                throw new RuntimeException("Command failed with exit code " + exitCode + ": " + result);
            }

            log.info("Command completed successfully: {}", command);
            publishLog(logChannel, "[END]");

            // Return only last N lines as summary (full log is in Redis buffer)
            return getLastLines(result, OUTPUT_SUMMARY_LINES);

        } catch (JobTimeoutException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            publishLog(logChannel, "[END]");
            throw new RuntimeException("Command execution interrupted", e);
        } catch (Exception e) {
            log.error("Command execution failed: {}", command, e);
            publishLog(logChannel, "[END]");
            throw new RuntimeException("Command execution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get last N lines from a string
     */
    private String getLastLines(String text, int maxLines) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        String[] lines = text.split("\n");
        if (lines.length <= maxLines) {
            return text;
        }
        StringBuilder sb = new StringBuilder();
        int startIndex = lines.length - maxLines;
        for (int i = startIndex; i < lines.length; i++) {
            if (sb.length() > 0) {
                sb.append("\n");
            }
            sb.append(lines[i]);
        }
        return sb.toString();
    }

    /**
     * Publish log line to Redis channel and buffer for late subscribers
     */
    private void publishLog(String channel, String message) {
        try {
            // Publish to Pub/Sub for real-time subscribers (raw output without timestamp)
            redisTemplate.convertAndSend(channel, message);

            // Also store in a LIST for late subscribers (buffer)
            String bufferKey = channel.replace(LOG_CHANNEL_PREFIX, LOG_BUFFER_PREFIX);
            redisTemplate.opsForList().rightPush(bufferKey, message);

            // Trim buffer to max size
            redisTemplate.opsForList().trim(bufferKey, -LOG_BUFFER_MAX_SIZE, -1);

            // Set TTL if not already set
            if (Boolean.FALSE.equals(redisTemplate.hasKey(bufferKey + ":ttl"))) {
                redisTemplate.expire(bufferKey, Duration.ofHours(LOG_BUFFER_TTL_HOURS));
                redisTemplate.opsForValue().set(bufferKey + ":ttl", "1", Duration.ofHours(LOG_BUFFER_TTL_HOURS));
            }
        } catch (Exception e) {
            log.warn("Failed to publish log to Redis: {}", e.getMessage());
        }
    }
}
