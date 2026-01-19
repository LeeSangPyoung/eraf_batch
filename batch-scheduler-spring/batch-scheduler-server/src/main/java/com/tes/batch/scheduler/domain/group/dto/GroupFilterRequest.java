package com.tes.batch.scheduler.domain.group.dto;

import lombok.Data;

@Data
public class GroupFilterRequest {
    private String textSearch;
    private Integer page = 0;
    private Integer size = 20;
}
