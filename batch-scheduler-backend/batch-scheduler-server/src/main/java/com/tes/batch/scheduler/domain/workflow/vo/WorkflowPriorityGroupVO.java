package com.tes.batch.scheduler.domain.workflow.vo;

import com.tes.batch.scheduler.domain.job.vo.JobVO;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Workflow Priority Group VO.
 * Groups jobs by priority within a workflow for DAG execution.
 * Maps to scheduler_workflow_priority_group table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowPriorityGroupVO {

    private String id;

    /**
     * Workflow ID (FK)
     */
    private String workflowId;

    /**
     * Latest execution status
     */
    private String latestStatus;

    /**
     * Priority level (lower executes first)
     */
    private Integer priority;

    /**
     * Whether to ignore job results in this group
     */
    @Builder.Default
    private Boolean ignoreResult = false;

    /**
     * First registration date (epoch ms)
     */
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    private Long lastChgDate;

    /**
     * Jobs in this priority group
     */
    @Builder.Default
    private List<JobVO> jobs = new ArrayList<>();

    /**
     * Job IDs for insert/update operations
     */
    @Builder.Default
    private List<String> jobIds = new ArrayList<>();
}
