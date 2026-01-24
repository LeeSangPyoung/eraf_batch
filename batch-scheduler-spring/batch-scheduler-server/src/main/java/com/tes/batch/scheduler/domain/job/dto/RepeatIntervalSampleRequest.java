package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RepeatIntervalSampleRequest {
    @JsonProperty("repeat_interval")
    private String repeatInterval;

    @JsonProperty("start_date")
    private Long startDate;

    private String timezone;
}
