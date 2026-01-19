package com.tes.batch.scheduler.domain.workflow.dto;

import lombok.Data;

import java.util.List;

@Data
public class WorkflowRequest {
    private String id;
    private String workflowName;
    private String groupId;
    private Long startDate;
    private String repeatInterval;
    private String timezone;
    private List<PriorityGroupRequest> priorityGroups;

    @Data
    public static class PriorityGroupRequest {
        private String id;
        private Integer priority;
        private Boolean ignoreResult;
        private List<JobInGroupRequest> jobs;
    }

    @Data
    public static class JobInGroupRequest {
        private String jobId;
        private Integer workflowDelay;
    }
}
