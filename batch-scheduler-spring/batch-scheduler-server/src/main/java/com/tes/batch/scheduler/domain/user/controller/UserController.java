package com.tes.batch.scheduler.domain.user.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.user.dto.LoginRequest;
import com.tes.batch.scheduler.domain.user.dto.LoginResponse;
import com.tes.batch.scheduler.domain.user.dto.UserFilterRequest;
import com.tes.batch.scheduler.domain.user.dto.UserInfoResponse;
import com.tes.batch.scheduler.domain.user.dto.UserRequest;
import com.tes.batch.scheduler.domain.user.service.UserService;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
