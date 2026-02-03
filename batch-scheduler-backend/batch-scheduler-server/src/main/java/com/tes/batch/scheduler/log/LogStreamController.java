package com.tes.batch.scheduler.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * Controller for real-time log streaming via SSE
 */
@Slf4j
@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogStreamController {

    private final LogStreamService logStreamService;

    /**
     * Stream logs for a specific task in real-time
     *
     * @param taskId The task ID to stream logs for
     * @return SseEmitter for real-time log streaming
     */
    @GetMapping(value = "/{taskId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLogs(@PathVariable String taskId) {
        log.info("Client connected to log stream for taskId: {}", taskId);
        return logStreamService.createEmitter(taskId);
    }

    /**
     * Get stored logs for a completed task from database
     *
     * @param taskId The task ID to get logs for
     * @return Stored log output
     */
    @GetMapping("/{taskId}")
    public String getStoredLogs(@PathVariable String taskId) {
        return logStreamService.getStoredLogs(taskId);
    }

    /**
     * Get buffered logs from Redis for recently completed tasks
     * Returns formatted logs with timestamps if available (within 24 hours)
     *
     * @param taskId The task ID to get logs for
     * @return JSON response with buffered logs array, or empty if buffer expired
     */
    @GetMapping("/{taskId}/buffered")
    public ResponseEntity<Map<String, Object>> getBufferedLogs(@PathVariable String taskId) {
        List<String> bufferedLogs = logStreamService.getBufferedLogs(taskId);
        if (bufferedLogs != null && !bufferedLogs.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "available", true,
                "logs", bufferedLogs
            ));
        }
        return ResponseEntity.ok(Map.of(
            "available", false,
            "logs", List.of()
        ));
    }
}
