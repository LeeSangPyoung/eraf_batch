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
import java.util.regex.Pattern;

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
    private static final int MAX_OUTPUT_BYTES = 10 * 1024 * 1024; // [P6] 10MB max output buffer
    private static final int MAX_LINE_LENGTH = 10_000; // [H6] Max chars per line

    // [S1] Dangerous shell metacharacters that indicate injection attempts
    private static final Pattern INJECTION_PATTERN = Pattern.compile(
            "[;`]|&&|\\|\\||\\$\\(|\\$\\{|\\beval\\b|\\bexec\\b|>/dev/|\\brm\\s+-rf\\s+/"
    );

    // [S12] Patterns to mask sensitive data in logs
    private static final Pattern SENSITIVE_PATTERN = Pattern.compile(
            "(?i)(password|passwd|secret|token|api[_-]?key|authorization|credential)\\s*[=:]\\s*\\S+"
    );

    public String execute(JobMessage message) {
        String command = message.getJobAction();
        String taskId = message.getTaskId();
        Duration timeout = message.getMaxDuration() != null ? message.getMaxDuration() : Duration.ofMinutes(5);
        String logChannel = LOG_CHANNEL_PREFIX + taskId;

        // [S1] Validate command
        validateCommand(command);
        // [S12] Mask sensitive data in log
        log.info("Executing command: {} (timeout: {})", maskSensitiveData(command), timeout);

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
            final boolean[] outputTruncated = {false};
            Thread outputReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        // [H6] Truncate extremely long lines
                        if (line.length() > MAX_LINE_LENGTH) {
                            line = line.substring(0, MAX_LINE_LENGTH) + "... (truncated)";
                        }
                        // [P6] Check output buffer size limit
                        if (output.length() < MAX_OUTPUT_BYTES) {
                            output.append(line).append("\n");
                        } else if (!outputTruncated[0]) {
                            outputTruncated[0] = true;
                            log.warn("Output buffer exceeded {}MB limit, truncating", MAX_OUTPUT_BYTES / 1024 / 1024);
                        }
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
                // [H5] Kill entire process tree (children first, then parent)
                try {
                    process.toHandle().descendants().forEach(ph -> {
                        try { ph.destroyForcibly(); } catch (Exception ignored) {}
                    });
                } catch (Exception ignored) {}
                // Close streams before destroying process to unblock output reader
                try { process.getInputStream().close(); } catch (Exception ignored) {}
                try { process.getOutputStream().close(); } catch (Exception ignored) {}
                try { process.getErrorStream().close(); } catch (Exception ignored) {}
                process.destroyForcibly();
                outputReader.join(10000);
                publishLog(logChannel, "[END]");
                throw new JobTimeoutException("Command timed out after " + timeout);
            }

            // Wait for output reader to finish
            outputReader.join(30000);
            if (outputReader.isAlive()) {
                outputReader.interrupt();
            }

            int exitCode = process.exitValue();
            String result = output.toString().trim();

            if (exitCode != 0) {
                log.warn("Command exited with code {}: {}", exitCode, maskSensitiveData(command));
                publishLog(logChannel, "[END]");
                throw new RuntimeException("Command failed with exit code " + exitCode + ": " + result);
            }

            log.info("Command completed successfully: {}", maskSensitiveData(command));
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
            log.error("Command execution failed: {}", maskSensitiveData(command), e);
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

    /** [S1] Validate command for potential injection patterns */
    private void validateCommand(String command) {
        if (command == null || command.isBlank()) {
            throw new IllegalArgumentException("Command cannot be empty");
        }
        if (INJECTION_PATTERN.matcher(command).find()) {
            log.warn("Potentially dangerous command blocked: {}", maskSensitiveData(command));
            throw new SecurityException("Command contains disallowed shell metacharacters");
        }
    }

    /** [S12] Mask sensitive data in strings (passwords, tokens, keys) */
    private String maskSensitiveData(String input) {
        if (input == null) return null;
        return SENSITIVE_PATTERN.matcher(input).replaceAll("$1=****");
    }

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
