package com.tes.batch.scheduler.domain.workflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WorkflowResponse {
    @JsonProperty("workflow_id")
    private String id;

    @JsonProperty("workflow_name")
    private String workflowName;

    @JsonProperty("group_id")
    private String groupId;

    @JsonProperty("group")
    private String groupName;

    @JsonProperty("latest_status")
    private String latestStatus;

    @JsonProperty("start_date")
    private Long startDate;

    @JsonProperty("repeat_interval")
    private String repeatInterval;

    private String timezone;

    @JsonProperty("next_run_date")
    private Long nextRunDate;

    @JsonProperty("last_run_date")
    private Long lastRunDate;

    @JsonProperty("frst_reg_date")
    private Long frstRegDate;

    @JsonProperty("last_chg_date")
    private Long lastChgDate;

    @JsonProperty("priority_groups")
    private List<PriorityGroupResponse> priorityGroups;

    @Data
    @Builder
    public static class PriorityGroupResponse {
        private String id;
        private Integer priority;

        @JsonProperty("ignore_result")
        private Boolean ignoreResult;

        private List<JobInGroupResponse> jobs;
    }

    @Data
    @Builder
    public static class JobInGroupResponse {
        @JsonProperty("job_id")
        private String jobId;

        @JsonProperty("job_name")
        private String jobName;

        @JsonProperty("workflow_delay")
        private Integer workflowDelay;
    }

    public static WorkflowResponse from(WorkflowVO vo) {
        return WorkflowResponse.builder()
                .id(vo.getId())
                .workflowName(vo.getWorkflowName())
                .groupId(vo.getGroupId())
                .groupName(vo.getGroupName())
                .latestStatus(vo.getLatestStatus())
                .startDate(vo.getStartDate())
                .repeatInterval(vo.getRepeatInterval())
                .timezone(vo.getTimezone())
                .nextRunDate(vo.getNextRunDate())
                .lastRunDate(vo.getLastRunDate())
                .frstRegDate(vo.getFrstRegDate())
                .lastChgDate(vo.getLastChgDate())
                .build();
    }

    public static PriorityGroupResponse fromPriorityGroup(WorkflowPriorityGroupVO vo) {
        return PriorityGroupResponse.builder()
                .id(vo.getId())
                .priority(vo.getPriority())
                .ignoreResult(vo.getIgnoreResult())
                .build();
    }
}
