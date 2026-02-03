package com.tes.batch.scheduler.domain.workflow.vo;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Workflow VO for workflow definitions.
 * Maps to scheduler_workflow table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowVO {

    private String id;
    private String workflowName;

    /**
     * Group ID (FK)
     */
    private String groupId;

    /**
     * Latest execution status
     */
    private String latestStatus;

    /**
     * Start date for scheduling (epoch ms)
     */
    private Long startDate;

    /**
     * RRULE format repeat interval
     */
    private String repeatInterval;

    /**
     * Timezone for scheduling
     */
    @Builder.Default
    private String timezone = "UTC";

    /**
     * Next scheduled run date (epoch ms)
     */
    private Long nextRunDate;

    /**
     * Last run date (epoch ms)
     */
    private Long lastRunDate;

    /**
     * First registration date (epoch ms)
     */
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    private Long lastChgDate;

    // === Joined fields ===
    private String groupName;

    /**
     * Priority groups in this workflow
     */
    @Builder.Default
    private List<WorkflowPriorityGroupVO> priorityGroups = new ArrayList<>();
}
