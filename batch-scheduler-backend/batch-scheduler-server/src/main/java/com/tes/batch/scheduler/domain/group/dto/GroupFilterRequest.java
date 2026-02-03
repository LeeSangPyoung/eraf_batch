package com.tes.batch.scheduler.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class GroupFilterRequest {
    @JsonAlias("search_text")
    private String textSearch;
    @JsonAlias("page_number")
    private Integer page = 0;
    @JsonAlias("page_size")
    private Integer size = 20;
}
