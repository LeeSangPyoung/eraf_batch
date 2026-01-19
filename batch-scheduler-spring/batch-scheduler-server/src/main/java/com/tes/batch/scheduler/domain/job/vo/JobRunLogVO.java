package com.tes.batch.scheduler.domain.job.vo;

import lombok.*;

/**
 * Job Run Log VO for execution history.
 * Maps to scheduler_job_run_logs table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobRunLogVO {

    private Long logId;
    private String jobId;
    private String groupId;
    private String systemId;

    /**
     * Celery task name / Task ID
     */
    private String celeryTaskName;

    /**
     * Job name snapshot at execution time
     */
    private String jobName;

    /**
     * Group name snapshot at execution time
     */
    private String groupName;

    /**
     * System name snapshot at execution time
     */
    private String systemName;

    /**
     * Operation type: RUN, COMPLETED, BROKEN, etc.
     */
    private String operation;

    /**
     * Batch type: Auto, Manual
     */
    private String batchType;

    /**
     * Execution status: STARTED, SUCCESS, FAILURE, TIMEOUT, etc.
     */
    private String status;

    /**
     * Requested start date (epoch ms)
     */
    private Long reqStartDate;

    /**
     * Actual start date (epoch ms)
     */
    private Long actualStartDate;

    /**
     * Actual end date (epoch ms)
     */
    private Long actualEndDate;

    /**
     * Run duration (e.g., "00:01:30")
     */
    private String runDuration;

    /**
     * Retry count for this execution
     */
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * Error number/code
     */
    private Integer errorNo;

    /**
     * Error message
     */
    private String errors;

    /**
     * Execution output
     */
    private String output;

    /**
     * Additional information (JSON)
     */
    private String additionalInfo;

    /**
     * Workflow run ID if part of a workflow
     */
    private Long workflowRunId;

    /**
     * Workflow priority level
     */
    private Integer workflowPriority;
}
