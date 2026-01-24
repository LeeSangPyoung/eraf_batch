package com.tes.batch.scheduler.domain.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class UserRequest {
    private String id;

    @JsonProperty("user_id")
    @JsonAlias("user_id")
    private String userId;

    @JsonProperty("user_name")
    @JsonAlias("user_name")
    private String userName;

    private String password;

    // Frontend sends this field but backend doesn't need it
    private String confirmPassword;

    @JsonProperty("user_type")
    @JsonAlias("user_type")
    private Integer userType;

    @JsonProperty("email_addr")
    @JsonAlias("email_addr")
    private String emailAddr;

    @JsonProperty("celp_tlno")
    @JsonAlias("celp_tlno")
    private String celpTlno;

    @JsonProperty("related_scheduler_group")
    @JsonAlias("related_scheduler_group")
    private List<String> relatedSchedulerGroup;
}
