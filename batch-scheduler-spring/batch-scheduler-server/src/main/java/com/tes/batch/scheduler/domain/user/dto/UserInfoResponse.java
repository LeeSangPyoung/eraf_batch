package com.tes.batch.scheduler.domain.user.dto;

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
    private String userId;
    private String userName;
    private Integer userType;
    private Boolean userStatus;
    private String celpTlno;
    private String emailAddr;
    private Long lastPwdChgDate;
    private Long lastLoginTime;
    private Long frstRegDate;
    private Long lastChgDate;
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
                .lastPwdChgDate(user.getLastPwdChgDate())
                .lastLoginTime(user.getLastLoginTime())
                .frstRegDate(user.getFrstRegDate())
                .lastChgDate(user.getLastChgDate())
                .relatedGroupIds(user.getRelatedGroupIds())
                .build();
    }
}
