package com.tes.batch.scheduler.domain.job.dto;

import lombok.Data;

@Data
public class JobRequest {
    private String jobId;
    private String jobName;
    private String systemId;
    private String groupId;
    private String jobType;
    private String jobAction;
    private String jobBody;
    private String jobComments;
    private Long startDate;
    private Long endDate;
    private String repeatInterval;
    private String timezone = "UTC";
    private Integer maxRun = 0;
    private Integer maxFailure = 0;
    private String maxRunDuration;
    private Integer retryDelay = 0;
    private Integer priority = 3;
    private Boolean isEnabled = true;
    private Boolean autoDrop = false;
    private Boolean restartOnFailure = false;
    private Boolean restartable = true;
    private Boolean ignoreResult = false;
    private Boolean runForever = false;
}
