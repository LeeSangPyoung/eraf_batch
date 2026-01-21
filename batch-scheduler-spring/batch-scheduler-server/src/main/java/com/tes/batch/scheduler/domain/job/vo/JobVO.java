package com.tes.batch.scheduler.domain.job.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("job_id")
    private String jobId;
    @JsonProperty("job_name")
    private String jobName;

    /**
     * Server ID (FK)
     */
    @JsonProperty("system_id")
    private String systemId;

    /**
     * Group ID (FK)
     */
    @JsonProperty("group_id")
    private String groupId;

    /**
     * Job type: REST_API or EXECUTABLE
     */
    @JsonProperty("job_type")
    private String jobType;

    /**
     * Job action: URL for REST_API, command for EXECUTABLE
     */
    @JsonProperty("job_action")
    private String jobAction;

    /**
     * Job body (JSON) for REST_API
     */
    @JsonProperty("job_body")
    private String jobBody;

    /**
     * Job comments/description
     */
    @JsonProperty("job_comments")
    private String jobComments;

    /**
     * Start date for scheduling (epoch ms)
     */
    @JsonProperty("start_date")
    private Long startDate;

    /**
     * End date for scheduling (epoch ms)
     */
    @JsonProperty("end_date")
    private Long endDate;

    /**
     * RRULE format repeat interval
     */
    @JsonProperty("repeat_interval")
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
    @JsonProperty("max_run")
    private Integer maxRun = 0;

    /**
     * Maximum number of failures before stopping
     */
    @Builder.Default
    @JsonProperty("max_failure")
    private Integer maxFailure = 0;

    /**
     * Maximum run duration (e.g., "01:00:00" for 1 hour)
     */
    @JsonProperty("max_run_duration")
    private String maxRunDuration;

    /**
     * Retry delay in seconds
     */
    @Builder.Default
    @JsonProperty("retry_delay")
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
    @JsonProperty("is_enabled")
    private Boolean isEnabled = true;

    /**
     * Current state: SCHEDULED, RUNNING, PAUSED, etc.
     */
    @Builder.Default
    @JsonProperty("current_state")
    private String currentState = "SCHEDULED";

    /**
     * Next scheduled run date (epoch ms)
     */
    @JsonProperty("next_run_date")
    private Long nextRunDate;

    /**
     * Last start date (epoch ms)
     */
    @JsonProperty("last_start_date")
    private Long lastStartDate;

    /**
     * Total run count
     */
    @Builder.Default
    @JsonProperty("run_count")
    private Integer runCount = 0;

    /**
     * Failure count
     */
    @Builder.Default
    @JsonProperty("failure_count")
    private Integer failureCount = 0;

    /**
     * Retry count
     */
    @Builder.Default
    @JsonProperty("retry_count")
    private Integer retryCount = 0;

    /**
     * Auto drop on failure
     */
    @Builder.Default
    @JsonProperty("auto_drop")
    private Boolean autoDrop = false;

    /**
     * Restart on failure
     */
    @Builder.Default
    @JsonProperty("restart_on_failure")
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
    @JsonProperty("ignore_result")
    private Boolean ignoreResult = false;

    /**
     * Run forever flag
     */
    @Builder.Default
    @JsonProperty("run_forever")
    private Boolean runForever = false;

    /**
     * Workflow ID if part of a workflow
     */
    @JsonProperty("workflow_id")
    private String workflowId;

    /**
     * Priority group ID in workflow
     */
    @JsonProperty("priority_group_id")
    private String priorityGroupId;

    /**
     * Delay before execution in workflow (seconds)
     */
    @Builder.Default
    @JsonProperty("workflow_delay")
    private Integer workflowDelay = 0;

    /**
     * First registration date (epoch ms)
     */
    @JsonProperty("frst_reg_date")
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    @JsonProperty("last_chg_date")
    private Long lastChgDate;

    /**
     * First registered user ID
     */
    @JsonProperty("frst_reg_user_id")
    private String frstRegUserId;

    /**
     * Last modified user ID
     */
    @JsonProperty("last_reg_user_id")
    private String lastRegUserId;

    // === Joined fields for convenience ===
    @JsonProperty("system_name")
    private String systemName;
    @JsonProperty("group_name")
    private String groupName;
}
