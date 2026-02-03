package com.tes.batch.common.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tes.batch.common.enums.JobType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Duration;

/**
 * Message sent from Scheduler to Agent for job execution.
 * Transmitted via Redis Pub/Sub.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Unique job identifier.
     */
    private String jobId;

    /**
     * Unique task execution identifier.
     */
    private String taskId;

    /**
     * Job name for logging.
     */
    private String jobName;

    /**
     * Type of job (REST_API or EXECUTABLE).
     */
    private JobType jobType;

    /**
     * Job action - URL for REST_API, command for EXECUTABLE.
     */
    private String jobAction;

    /**
     * Request body for REST_API jobs (JSON string).
     */
    private String jobBody;

    /**
     * HTTP headers for REST_API jobs (JSON string).
     */
    private String jobHeaders;

    /**
     * Maximum execution duration in seconds.
     */
    private Long maxDurationSeconds;

    /**
     * Number of retry attempts allowed.
     */
    private Integer retryCount;

    /**
     * Delay between retries in seconds.
     */
    private Integer retryDelay;

    /**
     * Workflow run ID if part of a workflow.
     */
    private Long workflowRunId;

    /**
     * Priority level (1-5, lower is higher priority).
     */
    private Integer priority;

    /**
     * Delay before execution in seconds (for workflow).
     */
    private Integer executionDelay;

    /**
     * Whether to ignore result in workflow.
     */
    private Boolean ignoreResult;

    /**
     * Target queue name (server identifier).
     */
    private String queueName;

    /**
     * Scheduled execution time (epoch milliseconds).
     */
    private Long scheduledTime;

    /**
     * Whether this is a manual execution.
     */
    private Boolean manuallyRun;

    /**
     * Get max duration as Duration object.
     */
    @JsonIgnore
    public Duration getMaxDuration() {
        return maxDurationSeconds != null ? Duration.ofSeconds(maxDurationSeconds) : null;
    }
}
