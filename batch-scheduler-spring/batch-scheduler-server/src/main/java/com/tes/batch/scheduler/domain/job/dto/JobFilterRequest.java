package com.tes.batch.scheduler.domain.job.dto;

import lombok.Data;

@Data
public class JobFilterRequest {
    private String jobId;
    private String groupId;
    private String systemId;
    private Boolean isEnabled;
    private String currentState;
    private String textSearch;
    private Boolean wfRegistered;
    private Long lastStartDateFrom;
    private Long lastStartDateTo;
    private Integer page = 0;
    private Integer size = 20;
}
