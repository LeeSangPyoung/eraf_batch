package com.tes.batch.scheduler.domain.server.dto;

import lombok.Data;

@Data
public class ServerFilterRequest {
    private String textSearch;
    private Integer page = 0;
    private Integer size = 20;
}
