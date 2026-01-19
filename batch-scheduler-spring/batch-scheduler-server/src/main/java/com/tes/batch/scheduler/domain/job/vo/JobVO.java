package com.tes.batch.scheduler.domain.job.vo;

import lombok.*;

/**
 * Job VO for batch job definitions.
 * Maps to scheduler_jobs table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobVO {

    private String jobId;
    private String jobName;

    /**
     * Server ID (FK)
     */
    private String systemId;

    /**
     * Group ID (FK)
     */
    private String groupId;

    /**
     * Job type: REST_API or EXECUTABLE
     */
    private String jobType;

    /**
     * Job action: URL for REST_API, command for EXECUTABLE
     */
    private String jobAction;

    /**
     * Job body (JSON) for REST_API
     */
    private String jobBody;

    /**
     * Job comments/description
     */
    private String jobComments;

    /**
     * Start date for scheduling (epoch ms)
     */
    private Long startDate;

    /**
     * End date for scheduling (epoch ms)
     */
    private Long endDate;

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
     * Maximum number of runs (0 = unlimited)
     */
    @Builder.Default
    private Integer maxRun = 0;

    /**
     * Maximum number of failures before stopping
     */
    @Builder.Default
    private Integer maxFailure = 0;

    /**
     * Maximum run duration (e.g., "01:00:00" for 1 hour)
     */
    private String maxRunDuration;

    /**
     * Retry delay in seconds
     */
    @Builder.Default
    private Integer retryDelay = 0;

    /**
     * Priority (1-5, lower is higher priority)
     */
    @Builder.Default
    private Integer priority = 3;

    /**
     * Whether the job is enabled
     */
    @Builder.Default
    private Boolean isEnabled = true;

    /**
     * Current state: SCHEDULED, RUNNING, PAUSED, etc.
     */
    @Builder.Default
    private String currentState = "SCHEDULED";

    /**
     * Next scheduled run date (epoch ms)
     */
    private Long nextRunDate;

    /**
     * Last start date (epoch ms)
     */
    private Long lastStartDate;

    /**
     * Total run count
     */
    @Builder.Default
    private Integer runCount = 0;

    /**
     * Failure count
     */
    @Builder.Default
    private Integer failureCount = 0;

    /**
     * Retry count
     */
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * Auto drop on failure
     */
    @Builder.Default
    private Boolean autoDrop = false;

    /**
     * Restart on failure
     */
    @Builder.Default
    private Boolean restartOnFailure = false;

    /**
     * Whether job can be restarted
     */
    @Builder.Default
    private Boolean restartable = true;

    /**
     * Ignore result in workflow
     */
    @Builder.Default
    private Boolean ignoreResult = false;

    /**
     * Run forever flag
     */
    @Builder.Default
    private Boolean runForever = false;

    /**
     * Workflow ID if part of a workflow
     */
    private String workflowId;

    /**
     * Priority group ID in workflow
     */
    private String priorityGroupId;

    /**
     * Delay before execution in workflow (seconds)
     */
    @Builder.Default
    private Integer workflowDelay = 0;

    /**
     * First registration date (epoch ms)
     */
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    private Long lastChgDate;

    /**
     * First registered user ID
     */
    private String frstRegUserId;

    /**
     * Last modified user ID
     */
    private String lastRegUserId;

    // === Joined fields for convenience ===
    private String systemName;
    private String groupName;
}
