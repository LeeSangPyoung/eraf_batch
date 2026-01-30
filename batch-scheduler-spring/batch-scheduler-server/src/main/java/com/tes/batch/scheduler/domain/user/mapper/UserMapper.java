package com.tes.batch.scheduler.domain.user.mapper;

import com.tes.batch.scheduler.domain.user.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

/**
 * MyBatis Mapper for User operations.
 */
@Mapper
public interface UserMapper {

    /**
     * Find user by primary key (id)
     */
    UserVO findById(@Param("id") String id);

    /**
     * Find user by login ID (user_id)
     */
    UserVO findByUserId(@Param("userId") String userId);

    /**
     * Find user with related groups
     */
    UserVO findByUserIdWithGroups(@Param("userId") String userId);

    /**
     * Check if user_id exists
     */
    boolean existsByUserId(@Param("userId") String userId);

    /**
     * Find all users
     */
    List<UserVO> findAll();

    /**
     * Find users with filters and pagination
     */
    List<UserVO> findByFilters(
            @Param("textSearch") String textSearch,
            @Param("userStatus") Boolean userStatus,
            @Param("groupId") String groupId,
            @Param("offset") int offset,
            @Param("limit") int limit
    );

    /**
     * Count users with filters
     */
    long countByFilters(
            @Param("textSearch") String textSearch,
            @Param("userStatus") Boolean userStatus,
            @Param("groupId") String groupId
    );

    /**
     * Find users by related group IDs
     */
    List<UserVO> findByRelatedGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("offset") int offset,
            @Param("limit") int limit
    );

    /**
     * Insert new user
     */
    int insert(UserVO user);

    /**
     * Update user
     */
    int update(UserVO user);

    /**
     * Update password
     */
    int updatePassword(
            @Param("id") String id,
            @Param("userPwd") String userPwd,
            @Param("lastPwdChgDate") Long lastPwdChgDate
    );

    /**
     * Update login info (last login time, reset fail count)
     */
    int updateLoginSuccess(
            @Param("id") String id,
            @Param("lastLoginTime") Long lastLoginTime
    );

    /**
     * Increment login failure count
     */
    int incrementLoginFailCount(@Param("id") String id);

    /**
     * Update user status (lock/unlock)
     */
    int updateStatus(
            @Param("id") String id,
            @Param("userStatus") Boolean userStatus
    );

    /**
     * Update last activity time
     */
    int updateLastActivityTime(
            @Param("id") String id,
            @Param("lastActivityTime") Long lastActivityTime
    );

    /**
     * Delete user
     */
    int delete(@Param("id") String id);

    /**
     * Insert user-group relation
     */
    int insertUserGroup(
            @Param("id") String id,
            @Param("userId") String internalUserId,
            @Param("groupId") String groupId
    );

    /**
     * Delete all user-group relations for a user
     */
    int deleteUserGroups(@Param("userId") String internalUserId);

    /**
     * Find related group IDs for a user
     */
    List<String> findRelatedGroupIds(@Param("userId") String internalUserId);

    /**
     * Count users related to a group
     */
    long countUsersByGroupId(@Param("groupId") String groupId);

    /**
     * Reset login fail count to 0
     */
    int resetLoginFailCount(@Param("id") String id);

    /**
     * Update user status (alias for updateStatus)
     */
    int updateUserStatus(@Param("id") String id, @Param("userStatus") Boolean userStatus);
}
