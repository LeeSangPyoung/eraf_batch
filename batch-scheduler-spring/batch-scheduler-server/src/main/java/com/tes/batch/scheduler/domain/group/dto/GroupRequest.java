package com.tes.batch.scheduler.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GroupRequest {
    @JsonAlias({"group_id", "groupId"})
    private String groupId;

    @JsonAlias({"group_name", "groupName"})
    private String groupName;

    @JsonAlias({"group_comments", "groupComments"})
    private String groupComments;

    @JsonAlias({"frst_reg_user_id"})
    private String frstRegUserId;

    @JsonAlias({"last_reg_user_id"})
    private String lastRegUserId;
}
