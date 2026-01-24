package com.tes.batch.scheduler.domain.job.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("log_id")
    private Long logId;

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("group_id")
    private String groupId;

    @JsonProperty("system_id")
    private String systemId;

    /**
     * Celery task name / Task ID
     */
    @JsonProperty("celery_task_name")
    private String celeryTaskName;

    /**
     * Job name snapshot at execution time
     */
    @JsonProperty("job_name")
    private String jobName;

    /**
     * Group name snapshot at execution time
     */
    @JsonProperty("group_name")
    private String groupName;

    /**
     * System name snapshot at execution time
     */
    @JsonProperty("system_name")
    private String systemName;

    /**
     * Operation type: RUN, COMPLETED, BROKEN, etc.
     */
    private String operation;

    /**
     * Batch type: Auto, Manual
     */
    @JsonProperty("batch_type")
    private String batchType;

    /**
     * Execution status: STARTED, SUCCESS, FAILURE, TIMEOUT, etc.
     */
    private String status;

    /**
     * Requested start date (epoch ms)
     */
    @JsonProperty("req_start_date")
    private Long reqStartDate;

    /**
     * Actual start date (epoch ms)
     */
    @JsonProperty("actual_start_date")
    private Long actualStartDate;

    /**
     * Actual end date (epoch ms)
     */
    @JsonProperty("actual_end_date")
    private Long actualEndDate;

    /**
     * Run duration (e.g., "00:01:30")
     */
    @JsonProperty("run_duration")
    private String runDuration;

    /**
     * Retry count for this execution
     */
    @JsonProperty("retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * Error number/code
     */
    @JsonProperty("error_no")
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
    @JsonProperty("additional_info")
    private String additionalInfo;

    /**
     * Workflow run ID if part of a workflow
     */
    @JsonProperty("workflow_run_id")
    private Long workflowRunId;

    /**
     * Workflow priority level
     */
    @JsonProperty("workflow_priority")
    private Integer workflowPriority;
}
