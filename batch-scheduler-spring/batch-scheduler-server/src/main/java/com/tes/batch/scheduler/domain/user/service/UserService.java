package com.tes.batch.scheduler.domain.user.service;

import com.tes.batch.scheduler.domain.user.dto.LoginRequest;
import com.tes.batch.scheduler.domain.user.dto.LoginResponse;
import com.tes.batch.scheduler.domain.user.dto.UserFilterRequest;
import com.tes.batch.scheduler.domain.user.dto.UserInfoResponse;
import com.tes.batch.scheduler.domain.user.dto.UserRequest;
import com.tes.batch.scheduler.domain.user.mapper.UserMapper;
import com.tes.batch.scheduler.domain.user.vo.UserVO;
import com.tes.batch.scheduler.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    private static final int MAX_LOGIN_FAIL_COUNT = 5;

    /**
     * User login
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {
        UserVO user = userMapper.findByUserId(request.getUserId());

        if (user == null) {
            throw new IllegalArgumentException("User not found: " + request.getUserId());
        }

        // Check if account is locked
        if (!user.getUserStatus()) {
            throw new IllegalStateException("Account is locked");
        }

        // Check if account is locked due to too many failed attempts
        if (user.getLoginFailCount() >= MAX_LOGIN_FAIL_COUNT) {
            throw new IllegalStateException("Account is locked due to too many failed login attempts");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getUserPwd())) {
            // Increment fail count
            userMapper.incrementLoginFailCount(user.getId());
            throw new IllegalArgumentException("Invalid password");
        }

        // Load related group IDs
        List<String> groupIds = userMapper.findRelatedGroupIds(user.getId());
        user.setRelatedGroupIds(groupIds);

        // Update login success
        long now = System.currentTimeMillis();
        userMapper.updateLoginSuccess(user.getId(), now);

        // Generate token
        String token = jwtTokenProvider.createToken(
                user.getUserId(),
                user.getId(),
                user.getUserType(),
                new HashSet<>(groupIds)
        );

        return LoginResponse.builder()
                .token(token)
                .user(UserInfoResponse.from(user))
                .build();
    }

    /**
     * Get user info by ID
     */
    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfo(String id) {
        UserVO user = userMapper.findById(id);
        if (user == null) {
            throw new IllegalArgumentException("User not found: " + id);
        }

        List<String> groupIds = userMapper.findRelatedGroupIds(id);
        user.setRelatedGroupIds(groupIds);

        return UserInfoResponse.from(user);
    }

    /**
     * Get user info by user ID (login ID)
     */
    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfoByUserId(String userId) {
        UserVO user = userMapper.findByUserId(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found: " + userId);
        }

        List<String> groupIds = userMapper.findRelatedGroupIds(user.getId());
        user.setRelatedGroupIds(groupIds);

        return UserInfoResponse.from(user);
    }

    /**
     * Update last activity time
     */
    @Transactional
    public void updateLastActivityTime(String id) {
        userMapper.updateLastActivityTime(id, System.currentTimeMillis());
    }

    /**
     * Get all users
     */
    @Transactional(readOnly = true)
    public List<UserInfoResponse> getAllUsers() {
        List<UserVO> users = userMapper.findAll();
        return users.stream()
                .map(user -> {
                    List<String> groupIds = userMapper.findRelatedGroupIds(user.getId());
                    user.setRelatedGroupIds(groupIds);
                    return UserInfoResponse.from(user);
                })
                .toList();
    }

    /**
     * Get users with filter
     */
    @Transactional(readOnly = true)
    public List<UserInfoResponse> getUsers(UserFilterRequest request) {
        int page = request.getPage() != null ? request.getPage() : 1;
        int size = request.getSize() != null ? request.getSize() : 20;
        int offset = (page - 1) * size;

        List<UserVO> users = userMapper.findByFilters(
                request.getTextSearch(),
                request.getUserStatus(),
                request.getGroupId(),
                offset,
                size
        );

        return users.stream()
                .map(user -> {
                    List<String> groupIds = userMapper.findRelatedGroupIds(user.getId());
                    user.setRelatedGroupIds(groupIds);
                    return UserInfoResponse.from(user);
                })
                .toList();
    }

    /**
     * Count users with filter
     */
    @Transactional(readOnly = true)
    public long countUsers(UserFilterRequest request) {
        return userMapper.countByFilters(
                request.getTextSearch(),
                request.getUserStatus(),
                request.getGroupId()
        );
    }

    /**
     * Create new user
     */
    @Transactional
    public UserInfoResponse createUser(UserRequest request) {
        // Check if user_id already exists
        if (userMapper.existsByUserId(request.getUserId())) {
            throw new IllegalArgumentException("User ID already exists: " + request.getUserId());
        }

        long now = System.currentTimeMillis();
        String id = java.util.UUID.randomUUID().toString();

        UserVO user = UserVO.builder()
                .id(id)
                .userId(request.getUserId())
                .userName(request.getUserName())
                .userType(request.getUserType())
                .userStatus(true)
                .userPwd(passwordEncoder.encode(request.getPassword()))
                .celpTlno(request.getCelpTlno())
                .emailAddr(request.getEmailAddr())
                .loginFailCount(0)
                .lastPwdChgDate(now)
                .frstRegDate(now)
                .lastChgDate(now)
                .build();

        userMapper.insert(user);

        // Insert user-group relations
        if (request.getRelatedSchedulerGroup() != null) {
            for (String groupId : request.getRelatedSchedulerGroup()) {
                userMapper.insertUserGroup(
                        java.util.UUID.randomUUID().toString(),
                        id,
                        groupId
                );
            }
        }

        List<String> groupIds = userMapper.findRelatedGroupIds(id);
        user.setRelatedGroupIds(groupIds);

        return UserInfoResponse.from(user);
    }

    /**
     * Update user
     */
    @Transactional
    public UserInfoResponse updateUser(String id, UserRequest request) {
        UserVO existing = userMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("User not found: " + id);
        }

        long now = System.currentTimeMillis();

        existing.setUserName(request.getUserName());
        existing.setUserType(request.getUserType());
        existing.setCelpTlno(request.getCelpTlno());
        existing.setEmailAddr(request.getEmailAddr());
        existing.setLastChgDate(now);

        userMapper.update(existing);

        // Update password if provided
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            userMapper.updatePassword(id, passwordEncoder.encode(request.getPassword()), now);
        }

        // Update user-group relations
        userMapper.deleteUserGroups(id);
        if (request.getRelatedSchedulerGroup() != null) {
            for (String groupId : request.getRelatedSchedulerGroup()) {
                userMapper.insertUserGroup(
                        java.util.UUID.randomUUID().toString(),
                        id,
                        groupId
                );
            }
        }

        List<String> groupIds = userMapper.findRelatedGroupIds(id);
        existing.setRelatedGroupIds(groupIds);

        return UserInfoResponse.from(existing);
    }

    /**
     * Delete user
     */
    @Transactional
    public void deleteUser(String id) {
        UserVO existing = userMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("User not found: " + id);
        }

        // Delete user-group relations first
        userMapper.deleteUserGroups(id);
        // Delete user
        userMapper.delete(id);
    }
}
