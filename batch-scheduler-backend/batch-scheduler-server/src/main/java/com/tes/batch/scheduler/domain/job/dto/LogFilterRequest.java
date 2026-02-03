package com.tes.batch.scheduler.domain.job.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class LogFilterRequest {
    @JsonAlias("job_id")
    private String jobId;

    @JsonAlias("group_id")
    private String groupId;

    @JsonAlias("system_id")
    private String systemId;

    private String operation;
    private String status;

    @JsonAlias("text_search")
    private String textSearch;

    @JsonAlias("req_start_date_from")
    private Long reqStartDateFrom;

    @JsonAlias("req_start_date_to")
    private Long reqStartDateTo;

    @JsonAlias("page_number")
    private Integer page = 0;

    @JsonAlias("page_size")
    private Integer size = 20;
}
