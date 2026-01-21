package com.tes.batch.scheduler.domain.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class LoginRequest {
    @JsonAlias({"user_id", "userId"})
    private String userId;

    @JsonAlias({"password", "userPwd"})
    private String password;
}
