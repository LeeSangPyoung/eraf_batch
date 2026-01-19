package com.tes.batch.scheduler.domain.job.dto;

import lombok.Data;

@Data
public class LogFilterRequest {
    private String jobId;
    private String groupId;
    private String systemId;
    private String operation;
    private String status;
    private String textSearch;
    private Long reqStartDateFrom;
    private Long reqStartDateTo;
    private Integer page = 0;
    private Integer size = 20;
}
