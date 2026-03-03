package com.tes.batch.scheduler.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * [L5] Rate limiting filter using token bucket algorithm
 * - 100 requests per minute per IP for regular endpoints
 * - 5 login attempts per minute per IP
 */
@Slf4j
@Component
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    // General rate limit: 1000 requests per minute (increased for Dashboard usage)
    private static final int GENERAL_CAPACITY = 1000;
    private static final int GENERAL_REFILL_TOKENS = 1000;
    private static final Duration GENERAL_REFILL_DURATION = Duration.ofMinutes(1);

    // Login rate limit: 5 attempts per minute
    private static final int LOGIN_CAPACITY = 5;
    private static final int LOGIN_REFILL_TOKENS = 5;
    private static final Duration LOGIN_REFILL_DURATION = Duration.ofMinutes(1);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String clientIp = getClientIp(httpRequest);
        String path = httpRequest.getRequestURI();

        // Whitelist local/private IPs (development environment)
        if (isWhitelistedIp(clientIp)) {
            chain.doFilter(request, response);
            return;
        }

        // Check if login endpoint
        boolean isLoginEndpoint = path.contains("/login");
        Bucket bucket = isLoginEndpoint
                ? loginBuckets.computeIfAbsent(clientIp, k -> createLoginBucket())
                : generalBuckets.computeIfAbsent(clientIp, k -> createGeneralBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, path);
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
        }
    }

    private boolean isWhitelistedIp(String ip) {
        if (ip == null) return false;
        // Whitelist local and private network IPs
        return ip.equals("127.0.0.1") ||
               ip.equals("0:0:0:0:0:0:0:1") ||
               ip.equals("::1") ||
               ip.startsWith("192.168.") ||
               ip.startsWith("10.") ||
               ip.startsWith("172.16.") ||
               ip.startsWith("172.17.") ||
               ip.startsWith("172.18.") ||
               ip.startsWith("172.19.") ||
               ip.startsWith("172.20.") ||
               ip.startsWith("172.21.") ||
               ip.startsWith("172.22.") ||
               ip.startsWith("172.23.") ||
               ip.startsWith("172.24.") ||
               ip.startsWith("172.25.") ||
               ip.startsWith("172.26.") ||
               ip.startsWith("172.27.") ||
               ip.startsWith("172.28.") ||
               ip.startsWith("172.29.") ||
               ip.startsWith("172.30.") ||
               ip.startsWith("172.31.");
    }

    private Bucket createGeneralBucket() {
        Bandwidth limit = Bandwidth.classic(GENERAL_CAPACITY,
                Refill.intervally(GENERAL_REFILL_TOKENS, GENERAL_REFILL_DURATION));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createLoginBucket() {
        Bandwidth limit = Bandwidth.classic(LOGIN_CAPACITY,
                Refill.intervally(LOGIN_REFILL_TOKENS, LOGIN_REFILL_DURATION));
        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Handle multiple IPs in X-Forwarded-For (take the first)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
