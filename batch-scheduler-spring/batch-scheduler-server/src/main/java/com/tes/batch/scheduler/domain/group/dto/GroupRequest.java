package com.tes.batch.scheduler.domain.group.dto;

import lombok.Data;

@Data
public class GroupRequest {
    private String groupId;
    private String groupName;
    private String groupComments;
}
