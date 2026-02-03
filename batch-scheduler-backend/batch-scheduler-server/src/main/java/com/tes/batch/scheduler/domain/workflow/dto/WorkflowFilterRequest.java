package com.tes.batch.scheduler.domain.workflow.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class WorkflowFilterRequest {
    @JsonAlias({"workflow_name", "search_text"})
    private String workflowName;
    @JsonAlias("group_id")
    private String groupId;
    @JsonAlias("latest_status")
    private String latestStatus;
    @JsonAlias("page_number")
    private Integer page = 1;
    @JsonAlias("page_size")
    private Integer pageSize = 20;
}
