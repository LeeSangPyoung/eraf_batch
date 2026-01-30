package com.tes.batch.scheduler.domain.workflow.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkflowRequest {
    @JsonProperty("workflow_id")
    private String id;

    @JsonProperty("workflow_name")
    private String workflowName;

    @JsonProperty("group_id")
    private String groupId;

    @JsonProperty("start_date")
    private Long startDate;

    @JsonProperty("repeat_interval")
    private String repeatInterval;

    private String timezone;

    @JsonProperty("priority_groups")
    private List<PriorityGroupRequest> priorityGroups;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PriorityGroupRequest {
        private String id;
        private Integer priority;

        @JsonProperty("ignore_result")
        private Boolean ignoreResult;

        private List<JobInGroupRequest> jobs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class JobInGroupRequest {
        @JsonProperty("job_id")
        private String jobId;

        @JsonProperty("workflow_delay")
        private Integer workflowDelay;
    }
}
