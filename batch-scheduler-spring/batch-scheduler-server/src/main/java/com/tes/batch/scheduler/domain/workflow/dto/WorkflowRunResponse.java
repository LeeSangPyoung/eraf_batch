package com.tes.batch.scheduler.domain.workflow.dto;

import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WorkflowRunResponse {
    private String id;
    private String workflowId;
    private String workflowName;
    private String status;
    private Long startTime;
    private Long endTime;
    private String error;
    private List<JobRunDetail> jobRuns;

    @Data
    @Builder
    public static class JobRunDetail {
        private String jobId;
        private String jobName;
        private Integer priority;
        private String status;
        private Long startTime;
        private Long endTime;
        private String output;
        private String error;
    }

    public static WorkflowRunResponse from(WorkflowRunVO vo) {
        return WorkflowRunResponse.builder()
                .id(vo.getId())
                .workflowId(vo.getWorkflowId())
                .workflowName(vo.getWorkflowName())
                .status(vo.getStatus())
                .startTime(vo.getStartTime())
                .endTime(vo.getEndTime())
                .error(vo.getError())
                .build();
    }
}
