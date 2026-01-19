package com.tes.batch.common.dto;

import com.tes.batch.common.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Result message sent from Agent to Scheduler after job execution.
 * Transmitted via Redis Pub/Sub.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobResult implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Job identifier.
     */
    private String jobId;

    /**
     * Task execution identifier.
     */
    private String taskId;

    /**
     * Execution status.
     */
    private TaskStatus status;

    /**
     * Execution output/response.
     */
    private String output;

    /**
     * Error message if failed.
     */
    private String error;

    /**
     * Error code if applicable.
     */
    private Integer errorCode;

    /**
     * Actual start time (epoch milliseconds).
     */
    private Long startTime;

    /**
     * Actual end time (epoch milliseconds).
     */
    private Long endTime;

    /**
     * Execution duration in milliseconds.
     */
    private Long durationMs;

    /**
     * Current retry attempt (0-based).
     */
    private Integer retryAttempt;

    /**
     * Workflow run ID if part of a workflow.
     */
    private Long workflowRunId;

    /**
     * Queue name (server identifier).
     */
    private String queueName;

    /**
     * Create a running status result.
     */
    public static JobResult running(JobMessage message) {
        return JobResult.builder()
                .jobId(message.getJobId())
                .taskId(message.getTaskId())
                .status(TaskStatus.RUNNING)
                .startTime(System.currentTimeMillis())
                .workflowRunId(message.getWorkflowRunId())
                .queueName(message.getQueueName())
                .build();
    }

    /**
     * Create a success result.
     */
    public static JobResult success(JobMessage message, String output, long startTime) {
        long endTime = System.currentTimeMillis();
        return JobResult.builder()
                .jobId(message.getJobId())
                .taskId(message.getTaskId())
                .status(TaskStatus.SUCCESS)
                .output(output)
                .startTime(startTime)
                .endTime(endTime)
                .durationMs(endTime - startTime)
                .workflowRunId(message.getWorkflowRunId())
                .queueName(message.getQueueName())
                .build();
    }

    /**
     * Create a failed result.
     */
    public static JobResult failed(JobMessage message, String error, Integer errorCode, long startTime) {
        long endTime = System.currentTimeMillis();
        return JobResult.builder()
                .jobId(message.getJobId())
                .taskId(message.getTaskId())
                .status(TaskStatus.FAILED)
                .error(error)
                .errorCode(errorCode)
                .startTime(startTime)
                .endTime(endTime)
                .durationMs(endTime - startTime)
                .workflowRunId(message.getWorkflowRunId())
                .queueName(message.getQueueName())
                .build();
    }

    /**
     * Create a timeout result.
     */
    public static JobResult timeout(JobMessage message, long startTime) {
        long endTime = System.currentTimeMillis();
        return JobResult.builder()
                .jobId(message.getJobId())
                .taskId(message.getTaskId())
                .status(TaskStatus.TIMEOUT)
                .error("Job execution timed out")
                .startTime(startTime)
                .endTime(endTime)
                .durationMs(endTime - startTime)
                .workflowRunId(message.getWorkflowRunId())
                .queueName(message.getQueueName())
                .build();
    }

    /**
     * Create a revoked result.
     */
    public static JobResult revoked(JobMessage message) {
        return JobResult.builder()
                .jobId(message.getJobId())
                .taskId(message.getTaskId())
                .status(TaskStatus.REVOKED)
                .error("Job was revoked/cancelled")
                .endTime(System.currentTimeMillis())
                .workflowRunId(message.getWorkflowRunId())
                .queueName(message.getQueueName())
                .build();
    }
}
