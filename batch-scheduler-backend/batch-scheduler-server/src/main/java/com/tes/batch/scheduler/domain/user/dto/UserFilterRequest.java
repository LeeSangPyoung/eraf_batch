package com.tes.batch.scheduler.domain.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class UserFilterRequest {
    @JsonAlias("group_id")
    private String groupId;

    @JsonAlias("user_status")
    private Boolean userStatus;

    @JsonAlias("text_search")
    private String textSearch;

    @JsonAlias("page_number")
    private Integer page = 1;

    @JsonAlias("page_size")
    private Integer size = 20;
}
