package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class JobRequest {
    @JsonAlias("job_id")
    private String jobId;

    @JsonAlias("job_name")
    private String jobName;

    @JsonAlias("system_id")
    private String systemId;

    @JsonAlias("group_id")
    private String groupId;

    @JsonAlias("job_type")
    private String jobType;

    @JsonAlias("job_action")
    private String jobAction;

    @JsonAlias("job_body")
    private String jobBody;

    @JsonAlias("job_comments")
    private String jobComments;

    @JsonAlias("start_date")
    private Long startDate;

    @JsonAlias("end_date")
    private Long endDate;

    @JsonAlias("repeat_interval")
    private String repeatInterval;

    private String timezone = "Asia/Seoul";

    @JsonAlias("max_run")
    private Integer maxRun = 0;

    @JsonAlias("max_failure")
    private Integer maxFailure = 0;

    @JsonAlias("max_run_duration")
    private String maxRunDuration;

    @JsonAlias("retry_delay")
    private Integer retryDelay = 0;

    private Integer priority = 3;

    @JsonAlias("is_enabled")
    private Boolean isEnabled = true;

    @JsonAlias("auto_drop")
    private Boolean autoDrop = false;

    @JsonAlias("restart_on_failure")
    private Boolean restartOnFailure = false;

    private Boolean restartable = true;

    @JsonAlias("ignore_result")
    private Boolean ignoreResult = false;

    @JsonAlias("run_forever")
    private Boolean runForever = false;
}
