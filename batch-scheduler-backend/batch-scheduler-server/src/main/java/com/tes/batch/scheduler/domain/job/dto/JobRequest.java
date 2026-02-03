package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JobRequest {
    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("job_name")
    private String jobName;

    @JsonProperty("system_id")
    private String systemId;

    @JsonProperty("secondary_system_id")
    private String secondarySystemId;

    @JsonProperty("tertiary_system_id")
    private String tertiarySystemId;

    @JsonProperty("group_id")
    private String groupId;

    @JsonProperty("job_type")
    private String jobType;

    @JsonProperty("job_action")
    private String jobAction;

    @JsonProperty("job_body")
    private String jobBody;

    @JsonProperty("job_headers")
    private String jobHeaders;

    @JsonProperty("job_comments")
    private String jobComments;

    @JsonProperty("start_date")
    private Long startDate;

    @JsonProperty("end_date")
    private Long endDate;

    @JsonProperty("repeat_interval")
    private String repeatInterval;

    private String timezone = "Asia/Seoul";

    @JsonProperty("max_run")
    private Integer maxRun = 0;

    @JsonProperty("max_failure")
    private Integer maxFailure = 0;

    @JsonProperty("max_run_duration")
    private String maxRunDuration;

    @JsonProperty("retry_delay")
    private Integer retryDelay = 0;

    private Integer priority = 3;

    @JsonProperty("is_enabled")
    private Boolean isEnabled = true;

    @JsonProperty("auto_drop")
    private Boolean autoDrop = false;

    @JsonProperty("restart_on_failure")
    private Boolean restartOnFailure = false;

    private Boolean restartable = true;

    @JsonProperty("ignore_result")
    private Boolean ignoreResult = false;

    @JsonProperty("run_forever")
    private Boolean runForever = false;
}
