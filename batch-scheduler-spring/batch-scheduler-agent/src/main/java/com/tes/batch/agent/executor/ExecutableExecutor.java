package com.tes.batch.agent.executor;

import com.tes.batch.common.dto.JobMessage;
import lombok.extern.slf4j.Slf4j;
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
public class ExecutableExecutor {

    /**
     * Execute shell command
     *
     * @param message Job message containing command
     * @return Command output
     */
    public String execute(JobMessage message) {
        String command = message.jobAction();
        Duration timeout = message.maxDuration() != null ? message.maxDuration() : Duration.ofMinutes(5);

        log.info("Executing command: {} (timeout: {})", command, timeout);

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
                        output.append(line).append("\n");
                    }
                } catch (IOException e) {
                    log.error("Error reading process output", e);
                }
            });
            outputReader.start();

            // Wait for process with timeout
            boolean completed = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);

            if (!completed) {
                process.destroyForcibly();
                throw new JobTimeoutException("Command timed out after " + timeout);
            }

            // Wait for output reader to finish
            outputReader.join(5000);

            int exitCode = process.exitValue();
            String result = output.toString().trim();

            if (exitCode != 0) {
                log.warn("Command exited with code {}: {}", exitCode, command);
                throw new RuntimeException("Command failed with exit code " + exitCode + ": " + result);
            }

            log.info("Command completed successfully: {}", command);
            return result;

        } catch (JobTimeoutException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Command execution interrupted", e);
        } catch (Exception e) {
            log.error("Command execution failed: {}", command, e);
            throw new RuntimeException("Command execution failed: " + e.getMessage(), e);
        }
    }
}
