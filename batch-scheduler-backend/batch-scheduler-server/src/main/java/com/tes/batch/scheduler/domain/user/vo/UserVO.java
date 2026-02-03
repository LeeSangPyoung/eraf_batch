package com.tes.batch.scheduler.domain.user.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * User Value Object for MyBatis mapping.
 * Maps to scheduler_users table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVO {

    private String id;
    private String userId;
    private String userName;

    /**
     * User type: 0 = Admin, 1 = User
     */
    private Integer userType;

    /**
     * Account status: true = active, false = locked
     */
    private Boolean userStatus;

    /**
     * Encrypted password (BCrypt)
     */
    private String userPwd;

    /**
     * Encrypted phone number
     */
    private String celpTlno;

    /**
     * Encrypted email address
     */
    private String emailAddr;

    /**
     * Login failure count
     */
    @Builder.Default
    private Integer loginFailCount = 0;

    /**
     * Last password change date (epoch ms)
     */
    private Long lastPwdChgDate;

    /**
     * Last login time (epoch ms)
     */
    private Long lastLoginTime;

    /**
     * First registration date (epoch ms)
     */
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    private Long lastChgDate;

    /**
     * Last activity time (epoch ms)
     */
    private Long lastActivityTime;

    /**
     * Related group IDs for access control
     */
    @Builder.Default
    private List<String> relatedGroupIds = new ArrayList<>();

    public boolean isAdmin() {
        return userType != null && userType == 0;
    }

    public boolean isActive() {
        return userStatus != null && userStatus;
    }
}
