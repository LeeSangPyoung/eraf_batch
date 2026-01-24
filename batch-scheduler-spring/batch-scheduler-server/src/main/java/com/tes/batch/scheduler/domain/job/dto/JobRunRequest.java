package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class JobRunRequest {
    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("user_id")
    private String userId;
}
