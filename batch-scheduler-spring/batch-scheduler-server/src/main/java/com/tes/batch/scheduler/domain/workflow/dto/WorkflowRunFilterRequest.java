package com.tes.batch.scheduler.domain.workflow.dto;

import lombok.Data;

@Data
public class WorkflowRunFilterRequest {
    private String workflowId;
    private String status;
    private Long startDateFrom;
    private Long startDateTo;
    private Integer page = 1;
    private Integer pageSize = 20;
}
