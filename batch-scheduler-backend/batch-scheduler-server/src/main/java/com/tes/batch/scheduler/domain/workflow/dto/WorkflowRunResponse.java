package com.tes.batch.scheduler.domain.workflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WorkflowRunResponse {
    @JsonProperty("workflow_run_id")
    private String id;

    @JsonProperty("workflow_id")
    private String workflowId;

    @JsonProperty("workflow_name")
    private String workflowName;

    private String status;

    @JsonProperty("start_date")
    private Long startTime;

    @JsonProperty("end_date")
    private Long endTime;

    private String error;

    @JsonProperty("total_jobs")
    private Integer totalJobs;

    @JsonProperty("job_runs")
    private List<JobRunLogVO> jobRuns;

    public static WorkflowRunResponse from(WorkflowRunVO vo) {
        return WorkflowRunResponse.builder()
                .id(vo.getId())
                .workflowId(vo.getWorkflowId())
                .workflowName(vo.getWorkflowName())
                .status(vo.getStatus())
                .startTime(vo.getStartTime())
                .endTime(vo.getEndTime())
                .error(vo.getError())
                .totalJobs(vo.getTotalJobs())
                .build();
    }
}
