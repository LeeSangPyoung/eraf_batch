package com.tes.batch.agent.executor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tes.batch.common.dto.JobMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Executor for REST API type jobs with real-time log streaming
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestApiExecutor {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    private static final String LOG_CHANNEL_PREFIX = "job:log:";
    private static final String LOG_BUFFER_PREFIX = "job:log:buffer:";
    private static final int LOG_BUFFER_MAX_SIZE = 1000;
    private static final int LOG_BUFFER_TTL_HOURS = 24;

    /**
     * Execute REST API call with real-time log streaming
     *
     * @param message Job message containing URL and body
     * @return Response body as string
     */
    public String execute(JobMessage message) {
        String action = message.getJobAction();
        String body = message.getJobBody();
        String headersJson = message.getJobHeaders();
        String taskId = message.getTaskId();
        Duration timeout = message.getMaxDuration() != null ? message.getMaxDuration() : Duration.ofMinutes(5);
        String logChannel = LOG_CHANNEL_PREFIX + taskId;

        // Parse method and URL from action
        HttpMethod method = determineMethod(action);
        String url = stripMethodPrefix(action);

        log.info("Executing REST API call: {} {} (timeout: {}, logChannel: {})", method, url, timeout, logChannel);

        try {
            WebClient webClient = webClientBuilder.build();

            WebClient.RequestBodySpec requestSpec = webClient
                    .method(method)
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON);

            // Apply custom headers if provided
            if (headersJson != null && !headersJson.isEmpty()) {
                Map<String, String> headers = parseHeaders(headersJson);
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    requestSpec = (WebClient.RequestBodySpec) requestSpec.header(entry.getKey(), entry.getValue());
                    log.debug("Added header: {} = {}", entry.getKey(), entry.getValue());
                }
            }

            Mono<String> responseMono;

            if (body != null && !body.isEmpty() && (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH)) {
                responseMono = requestSpec
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class);
            } else {
                responseMono = requestSpec
                        .retrieve()
                        .bodyToMono(String.class);
            }

            String response = responseMono
                    .timeout(timeout)
                    .onErrorResume(e -> {
                        if (e instanceof java.util.concurrent.TimeoutException) {
                            return Mono.error(new JobTimeoutException("REST API call timed out after " + timeout));
                        }
                        return Mono.error(e);
                    })
                    .block();

            log.info("REST API call completed successfully: {} {}", method, url);
            // Publish response (truncated if too long)
            if (response != null) {
                publishLog(logChannel, truncateForLog(response, 2000));
            }
            publishLog(logChannel, "[END]");

            return response;

        } catch (JobTimeoutException e) {
            publishLog(logChannel, "[END]");
            throw e;
        } catch (Exception e) {
            log.error("REST API call failed: {} {}", method, url, e);
            publishLog(logChannel, "[END]");
            throw new RuntimeException("REST API call failed: " + e.getMessage(), e);
        }
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

    /**
     * Truncate string for logging
     */
    private String truncateForLog(String str, int maxLength) {
        if (str == null) return "null";
        if (str.length() <= maxLength) return str;
        return str.substring(0, maxLength) + "... (truncated, total " + str.length() + " chars)";
    }

    /**
     * Parse headers from JSON string.
     * Supports two formats:
     * 1. Array of objects: [{"key": "Content-Type", "value": "application/json"}]
     * 2. Simple object: {"Content-Type": "application/json"}
     */
    @SuppressWarnings("unchecked")
    private Map<String, String> parseHeaders(String headersJson) {
        try {
            // First try to parse as array of {key, value} objects
            List<Map<String, String>> headersList = objectMapper.readValue(
                    headersJson,
                    new TypeReference<List<Map<String, String>>>() {}
            );

            // Convert list to map
            Map<String, String> headers = new java.util.HashMap<>();
            for (Map<String, String> header : headersList) {
                String key = header.get("key");
                String value = header.get("value");
                if (key != null && !key.isEmpty()) {
                    headers.put(key, value != null ? value : "");
                }
            }
            return headers;
        } catch (Exception e) {
            try {
                // Fall back to simple object format
                return objectMapper.readValue(headersJson, new TypeReference<Map<String, String>>() {});
            } catch (Exception ex) {
                log.warn("Failed to parse headers JSON: {}", headersJson);
                return Map.of();
            }
        }
    }

    /**
     * Determine HTTP method from action string
     * Format: "GET:url" or "POST:url" or just "url" (defaults to POST)
     */
    private HttpMethod determineMethod(String action) {
        if (action == null) {
            return HttpMethod.POST;
        }

        String upper = action.toUpperCase();
        if (upper.startsWith("GET:") || upper.startsWith("GET ")) {
            return HttpMethod.GET;
        } else if (upper.startsWith("PUT:") || upper.startsWith("PUT ")) {
            return HttpMethod.PUT;
        } else if (upper.startsWith("DELETE:") || upper.startsWith("DELETE ")) {
            return HttpMethod.DELETE;
        } else if (upper.startsWith("PATCH:") || upper.startsWith("PATCH ")) {
            return HttpMethod.PATCH;
        } else if (upper.startsWith("POST:") || upper.startsWith("POST ")) {
            return HttpMethod.POST;
        }

        return HttpMethod.POST;
    }

    /**
     * Strip HTTP method prefix from URL
     */
    private String stripMethodPrefix(String action) {
        if (action == null) {
            return "";
        }

        String[] prefixes = {"GET:", "GET ", "POST:", "POST ", "PUT:", "PUT ", "DELETE:", "DELETE ", "PATCH:", "PATCH "};
        String upper = action.toUpperCase();

        for (String prefix : prefixes) {
            if (upper.startsWith(prefix)) {
                return action.substring(prefix.length()).trim();
            }
        }

        return action;
    }
}
