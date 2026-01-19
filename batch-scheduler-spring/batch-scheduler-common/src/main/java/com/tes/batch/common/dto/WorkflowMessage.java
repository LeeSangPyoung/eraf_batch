package com.tes.batch.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * Message sent from Scheduler to Agent for workflow execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Workflow identifier.
     */
    private String workflowId;

    /**
     * Workflow run identifier.
     */
    private Long workflowRunId;

    /**
     * Workflow name for logging.
     */
    private String workflowName;

    /**
     * Priority groups containing jobs to execute.
     */
    private List<PriorityGroup> priorityGroups;

    /**
     * Target queue name.
     */
    private String queueName;

    /**
     * Priority group within a workflow.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriorityGroup implements Serializable {

        private static final long serialVersionUID = 1L;

        /**
         * Priority level (lower executes first).
         */
        private Integer priority;

        /**
         * Whether to ignore job results in this group.
         */
        private Boolean ignoreResult;

        /**
         * Jobs to execute in this priority group.
         */
        private List<JobMessage> jobs;
    }
}
