package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class JobFilterRequest {
    @JsonAlias("job_id")
    private String jobId;
    @JsonAlias("group_id")
    private String groupId;
    @JsonAlias("system_id")
    private String systemId;
    @JsonAlias("is_enabled")
    private Boolean isEnabled;
    @JsonAlias("current_state")
    private String currentState;
    @JsonAlias({"search_text", "text_search"})
    private String textSearch;
    @JsonAlias("wf_registered")
    private Boolean wfRegistered;
    @JsonAlias("last_result")
    private String lastResult;
    @JsonAlias("last_start_date_from")
    private Long lastStartDateFrom;
    @JsonAlias("last_start_date_to")
    private Long lastStartDateTo;
    @JsonAlias("page_number")
    private Integer page = 0;
    @JsonAlias("page_size")
    private Integer size = 20;
}
