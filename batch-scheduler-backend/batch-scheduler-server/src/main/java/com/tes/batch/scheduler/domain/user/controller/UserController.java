package com.tes.batch.scheduler.domain.user.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.user.dto.LoginRequest;
import com.tes.batch.scheduler.domain.user.dto.LoginResponse;
import com.tes.batch.scheduler.domain.user.dto.UserFilterRequest;
import com.tes.batch.scheduler.domain.user.dto.UserInfoResponse;
import com.tes.batch.scheduler.domain.user.dto.UserRequest;
import com.tes.batch.scheduler.domain.user.service.UserService;
import com.tes.batch.scheduler.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    /** [S9] Simple login rate limiter: max 5 attempts per IP per minute */
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long RATE_LIMIT_WINDOW_MS = 60_000L;
    private static final ConcurrentHashMap<String, long[]> loginAttempts = new ConcurrentHashMap<>();

    /**
     * User login
     * POST /user/login
     */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        // [S9] Rate limiting
        String clientIp = getClientIp(httpRequest);
        if (isRateLimited(clientIp)) {
            log.warn("Login rate limited for IP: {}", clientIp);
            return ApiResponse.error("Too many login attempts. Please try again later.");
        }

        try {
            LoginResponse response = userService.login(request);
            return ApiResponse.success(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            // [H4] Don't log user ID to prevent user enumeration in logs
            log.warn("Login failed: {}", e.getMessage());
            // Return generic error to prevent user enumeration via response
            return ApiResponse.error("Invalid credentials or account locked");
        }
    }

    /**
     * Get current user info
     * GET /user/info
     */
    @GetMapping("/info")
    public ApiResponse<UserInfoResponse> getUserInfo() {
        try {
            String currentId = securityUtils.getCurrentId();
            if (currentId == null) {
                return ApiResponse.error("Not authenticated");
            }

            // Update activity time
            userService.updateLastActivityTime(currentId);

            UserInfoResponse response = userService.getUserInfo(currentId);
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("Failed to get user info", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Keep session alive (update activity time)
     * POST /user/keepalive
     */
    @PostMapping("/keepalive")
    public ApiResponse<Void> keepAlive() {
        try {
            String currentId = securityUtils.getCurrentId();
            if (currentId != null) {
                userService.updateLastActivityTime(currentId);
            }
            return ApiResponse.success(null);
        } catch (Exception e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get all users
     * GET /user/all
     */
    @GetMapping("/all")
    public ApiResponse<List<UserInfoResponse>> getAllUsers() {
        try {
            List<UserInfoResponse> users = userService.getAllUsers();
            return ApiResponse.success(users);
        } catch (Exception e) {
            log.error("Failed to get all users", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get users with filter
     * POST /user/filter
     */
    @PostMapping("/filter")
    public ApiResponse<List<UserInfoResponse>> getUsers(@RequestBody UserFilterRequest request) {
        try {
            List<UserInfoResponse> users = userService.getUsers(request);
            long total = userService.countUsers(request);
            return ApiResponse.success(users, total);
        } catch (Exception e) {
            log.error("Failed to get users", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Create new user
     * POST /user/create
     */
    @PostMapping("/create")
    public ApiResponse<UserInfoResponse> createUser(@RequestBody UserRequest request) {
        try {
            UserInfoResponse response = userService.createUser(request);
            return ApiResponse.success(response);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to create user: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to create user", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update user
     * PUT /user/{id}
     */
    @PutMapping("/{id}")
    public ApiResponse<UserInfoResponse> updateUser(@PathVariable String id, @RequestBody UserRequest request) {
        try {
            UserInfoResponse response = userService.updateUser(id, request);
            return ApiResponse.success(response);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to update user: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update user", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update user (POST for frontend compatibility)
     * POST /user/update
     */
    @PostMapping("/update")
    public ApiResponse<UserInfoResponse> updateUserPost(@RequestBody UserRequest request) {
        try {
            UserInfoResponse response = userService.updateUser(request.getId(), request);
            return ApiResponse.success(response);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to update user: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update user", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Delete user
     * DELETE /user/{id}
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable String id) {
        try {
            userService.deleteUser(id);
            return ApiResponse.success(null);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to delete user: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to delete user", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Delete user (POST for frontend compatibility)
     * DELETE /user/delete
     */
    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteUserPost(@RequestBody java.util.Map<String, String> request) {
        try {
            String id = request.get("id");
            userService.deleteUser(id);
            return ApiResponse.success(null);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to delete user: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to delete user", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Reset user password to default 'eraf'
     * POST /user/reset
     */
    @PostMapping("/reset")
    public ApiResponse<Void> resetPassword(@RequestBody java.util.Map<String, String> request) {
        try {
            String targetUserId = request.get("target_user_id");
            userService.resetPassword(targetUserId);
            return ApiResponse.success(null);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to reset password: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to reset password", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Lock/Unlock user account
     * POST /user/lock
     */
    @PostMapping("/lock")
    public ApiResponse<Void> lockAccount(@RequestBody java.util.Map<String, Object> request) {
        try {
            String targetUserId = (String) request.get("target_user_id");
            Boolean userStatus = (Boolean) request.get("user_status");
            userService.updateUserStatus(targetUserId, userStatus);
            return ApiResponse.success(null);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to lock/unlock account: {}", e.getMessage());
            return ApiResponse.error(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to lock/unlock account", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /** [S9] Check if IP is rate limited (sliding window) */
    private boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        long[] window = loginAttempts.compute(ip, (k, v) -> {
            if (v == null || now - v[1] > RATE_LIMIT_WINDOW_MS) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });
        return window[0] > MAX_LOGIN_ATTEMPTS;
    }

    /** Extract client IP from request */
    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
