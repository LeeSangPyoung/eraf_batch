package com.tes.batch.scheduler.domain.workflow.dto;

import lombok.Data;

@Data
public class WorkflowFilterRequest {
    private String workflowName;
    private String groupId;
    private String latestStatus;
    private Integer page = 1;
    private Integer pageSize = 20;
}
