package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class JobStatusRequest {
    @JsonAlias("job_id")
    private String jobId;

    @JsonAlias("is_enabled")
    private Boolean isEnabled;

    @JsonAlias("last_reg_user_id")
    private String lastRegUserId;
}
