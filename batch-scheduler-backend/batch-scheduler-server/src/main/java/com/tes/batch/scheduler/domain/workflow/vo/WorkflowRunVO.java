package com.tes.batch.scheduler.domain.workflow.vo;

import lombok.*;

/**
 * Workflow Run VO for workflow execution history.
 * Maps to scheduler_workflow_run table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowRunVO {

    private Long workflowRunId;
    private String workflowId;

    /**
     * Alias for workflowRunId for consistent API response
     */
    public String getId() {
        return workflowRunId != null ? String.valueOf(workflowRunId) : null;
    }

    /**
     * Alias for startDate
     */
    public Long getStartTime() {
        return startDate;
    }

    /**
     * Alias for endDate
     */
    public Long getEndTime() {
        return endDate;
    }

    /**
     * Alias for errorMessage
     */
    public String getError() {
        return errorMessage;
    }

    /**
     * Workflow name snapshot at execution time
     */
    private String workflowName;

    /**
     * Start date (epoch ms)
     */
    private Long startDate;

    /**
     * End date (epoch ms)
     */
    private Long endDate;

    /**
     * Execution status: RUNNING, SUCCESS, FAILED, etc.
     */
    private String status;

    /**
     * Error message if failed
     */
    private String errorMessage;

    /**
     * Total jobs in this workflow run
     */
    private Integer totalJobs;

    /**
     * Completed jobs count
     */
    @Builder.Default
    private Integer completedJobs = 0;

    /**
     * Failed jobs count
     */
    @Builder.Default
    private Integer failedJobs = 0;

    /**
     * Run duration in milliseconds
     */
    private Long durationMs;
}
