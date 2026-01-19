package com.tes.batch.scheduler.domain.user.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.user.dto.LoginRequest;
import com.tes.batch.scheduler.domain.user.dto.LoginResponse;
import com.tes.batch.scheduler.domain.user.dto.UserInfoResponse;
import com.tes.batch.scheduler.domain.user.service.UserService;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    /**
     * User login
     * POST /user/login
     */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = userService.login(request);
            return ApiResponse.success(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Login failed for user {}: {}", request.getUserId(), e.getMessage());
            return ApiResponse.error(e.getMessage());
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
}
