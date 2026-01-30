package com.tes.batch.scheduler.domain.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tes.batch.scheduler.domain.user.vo.UserVO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoResponse {
    private String id;
    @JsonProperty("user_id")
    private String userId;
    @JsonProperty("user_name")
    private String userName;
    @JsonProperty("user_type")
    private Integer userType;
    @JsonProperty("user_status")
    private Boolean userStatus;
    @JsonProperty("celp_tlno")
    private String celpTlno;
    @JsonProperty("email_addr")
    private String emailAddr;
    @JsonProperty("lgin_fail_ncnt")
    private Integer loginFailCount;
    @JsonProperty("last_pwd_chg_date")
    private Long lastPwdChgDate;
    @JsonProperty("last_login_time")
    private Long lastLoginTime;
    @JsonProperty("frst_reg_date")
    private Long frstRegDate;
    @JsonProperty("last_chg_date")
    private Long lastChgDate;
    @JsonProperty("related_scheduler_group")
    private List<String> relatedGroupIds;

    public static UserInfoResponse from(UserVO user) {
        return UserInfoResponse.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userType(user.getUserType())
                .userStatus(user.getUserStatus())
                .celpTlno(user.getCelpTlno())
                .emailAddr(user.getEmailAddr())
                .loginFailCount(user.getLoginFailCount())
                .lastPwdChgDate(user.getLastPwdChgDate())
                .lastLoginTime(user.getLastLoginTime())
                .frstRegDate(user.getFrstRegDate())
                .lastChgDate(user.getLastChgDate())
                .relatedGroupIds(user.getRelatedGroupIds())
                .build();
    }
}
