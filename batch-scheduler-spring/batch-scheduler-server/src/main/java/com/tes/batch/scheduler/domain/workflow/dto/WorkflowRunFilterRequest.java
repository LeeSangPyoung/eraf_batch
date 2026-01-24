package com.tes.batch.scheduler.domain.workflow.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class WorkflowRunFilterRequest {
    @JsonProperty("workflow_id")
    private String workflowId;

    private String status;

    @JsonProperty("workflow_run_from")
    @JsonAlias({"workflow_run_from", "start_date_from"})
    private Long startDateFrom;

    @JsonProperty("workflow_run_to")
    @JsonAlias({"workflow_run_to", "start_date_to"})
    private Long startDateTo;

    @JsonProperty("page_number")
    private Integer page = 1;

    @JsonProperty("page_size")
    private Integer pageSize = 20;

    @JsonProperty("search_text")
    private String searchText;

    @JsonProperty("group_id")
    private String groupId;
}
