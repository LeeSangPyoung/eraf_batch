package com.tes.batch.agent.executor;

import com.tes.batch.common.dto.JobMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Executor for REST API type jobs
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestApiExecutor {

    private final WebClient.Builder webClientBuilder;

    /**
     * Execute REST API call
     *
     * @param message Job message containing URL and body
     * @return Response body as string
     */
    public String execute(JobMessage message) {
        String url = message.jobAction();
        String body = message.jobBody();
        Duration timeout = message.maxDuration() != null ? message.maxDuration() : Duration.ofMinutes(5);

        log.info("Executing REST API call: {} (timeout: {})", url, timeout);

        try {
            WebClient webClient = webClientBuilder.build();

            // Determine HTTP method from URL or default to POST
            HttpMethod method = determineMethod(url);

            WebClient.RequestBodySpec requestSpec = webClient
                    .method(method)
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON);

            Mono<String> responseMono;

            if (body != null && !body.isEmpty() && (method == HttpMethod.POST || method == HttpMethod.PUT)) {
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

            log.info("REST API call completed successfully: {}", url);
            return response;

        } catch (JobTimeoutException e) {
            throw e;
        } catch (Exception e) {
            log.error("REST API call failed: {}", url, e);
            throw new RuntimeException("REST API call failed: " + e.getMessage(), e);
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
        }

        return HttpMethod.POST;
    }
}
