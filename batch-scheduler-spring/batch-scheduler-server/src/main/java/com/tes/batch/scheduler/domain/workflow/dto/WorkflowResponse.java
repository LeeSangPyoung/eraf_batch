package com.tes.batch.scheduler.domain.workflow.dto;

import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WorkflowResponse {
    private String id;
    private String workflowName;
    private String groupId;
    private String groupName;
    private String latestStatus;
    private Long startDate;
    private String repeatInterval;
    private String timezone;
    private Long nextRunDate;
    private Long lastRunDate;
    private Long frstRegDate;
    private Long lastChgDate;
    private List<PriorityGroupResponse> priorityGroups;

    @Data
    @Builder
    public static class PriorityGroupResponse {
        private String id;
        private Integer priority;
        private Boolean ignoreResult;
        private List<JobInGroupResponse> jobs;
    }

    @Data
    @Builder
    public static class JobInGroupResponse {
        private String jobId;
        private String jobName;
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
