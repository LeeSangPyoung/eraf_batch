package com.tes.batch.scheduler.domain.group.vo;

import lombok.*;

/**
 * Job Group VO for organizing jobs.
 * Maps to scheduler_job_groups table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobGroupVO {

    private String groupId;
    private String groupName;
    private String groupComments;

    /**
     * First registration date (epoch ms)
     */
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    private Long lastChgDate;

    /**
     * First registered user ID (FK reference)
     */
    private String frstRegUserId;

    /**
     * Last modified user ID (FK reference)
     */
    private String lastRegUserId;
}
