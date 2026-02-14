package com.tes.batch.scheduler.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Collections;
import java.util.Set;

/**
 * Security utility class for getting current user information
 */
@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Get current authenticated user ID (login ID)
     */
    public String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return null;
    }

    /**
     * Get current user's internal ID
     */
    public String getCurrentId() {
        String token = getCurrentToken();
        if (token != null) {
            return jwtTokenProvider.getId(token);
        }
        return null;
    }

    /**
     * Get current user type (0: Admin, 1: User)
     */
    public Integer getCurrentUserType() {
        String token = getCurrentToken();
        if (token != null) {
            return jwtTokenProvider.getUserType(token);
        }
        return null;
    }

    /**
     * Get current user's related group IDs
     */
    public Set<String> getCurrentGroupIds() {
        String token = getCurrentToken();
        if (token != null) {
            return jwtTokenProvider.getGroupIds(token);
        }
        return Collections.emptySet();
    }

    /**
     * Check if current user is admin
     */
    public boolean isAdmin() {
        Integer userType = getCurrentUserType();
        return userType != null && userType == 0;
    }

    /**
     * Check if current user has access to a specific group
     */
    public boolean hasGroupAccess(String groupId) {
        if (isAdmin()) {
            return true;
        }
        Set<String> groupIds = getCurrentGroupIds();
        return groupIds.contains(groupId);
    }

    /**
     * Get current JWT token from request
     */
    private String getCurrentToken() {
        try {
            ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null && attributes.getRequest() != null) {
                String bearerToken = attributes.getRequest().getHeader("Authorization");
                return jwtTokenProvider.resolveToken(bearerToken);
            }
        } catch (Exception e) {
            // Can occur when called outside HTTP request context (scheduler, async, etc.)
        }
        return null;
    }
}
