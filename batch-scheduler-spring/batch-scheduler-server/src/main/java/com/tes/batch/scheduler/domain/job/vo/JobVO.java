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
     * Primary Server ID (FK)
     */
    @JsonProperty("system_id")
    private String systemId;

    /**
     * Secondary Server ID for failover (FK)
     */
    @JsonProperty("secondary_system_id")
    private String secondarySystemId;

    /**
     * Tertiary Server ID for failover (FK)
     */
    @JsonProperty("tertiary_system_id")
    private String tertiarySystemId;

    /**
     * Group ID (FK)
     */
    @JsonProperty("group_id")
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
     * Job headers (JSON) for REST_API - custom HTTP headers
     */
    private String jobHeaders;

    /**
     * Job comments/description (mapped as 'comment' for frontend)
     */
    @JsonProperty("comment")
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
     * Priority (1-5, lower is higher priority) - frontend uses 'jobPriority'
     */
    @Builder.Default
    @JsonProperty("jobPriority")
    private Integer priority = 3;

    /**
     * Whether the job is enabled - frontend uses 'enable'
     */
    @Builder.Default
    @JsonProperty("enable")
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
    @JsonProperty("workflow_id")
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
     * First registration date (epoch ms) - frontend uses 'jobCreateDate'
     */
    @JsonProperty("jobCreateDate")
    private Long frstRegDate;

    /**
     * Last change date (epoch ms) - frontend uses 'jobLastChgDate'
     */
    @JsonProperty("jobLastChgDate")
    private Long lastChgDate;

    /**
     * First registered user ID
     */
    private String frstRegUserId;

    /**
     * Last modified user ID
     */
    private String lastRegUserId;

    // === Joined fields for frontend compatibility ===
    /**
     * Primary Server name (mapped as 'system' for frontend)
     */
    @JsonProperty("system")
    private String systemName;

    /**
     * Secondary Server name for failover
     */
    @JsonProperty("secondary_system")
    private String secondarySystemName;

    /**
     * Tertiary Server name for failover
     */
    @JsonProperty("tertiary_system")
    private String tertiarySystemName;

    /**
     * Group name (mapped as 'group' for frontend)
     */
    @JsonProperty("group")
    private String groupName;

    /**
     * Creator name - first reg user name
     */
    private String creator;

    /**
     * Schedule string - derived from repeatInterval (e.g., "DAILY(1)")
     */
    private String schedule;

    /**
     * Last run duration - from last log
     */
    private String duration;

    /**
     * Last result status - from last log
     */
    private String lastResult;
}
