package com.tes.batch.scheduler.domain.group.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("id")
    private String groupId;
    @JsonProperty("name")
    private String groupName;
    @JsonProperty("group_comments")
    private String groupComments;

    /**
     * First registration date (epoch ms)
     */
    @JsonProperty("frst_reg_date")
    private Long frstRegDate;

    /**
     * Last change date (epoch ms)
     */
    @JsonProperty("last_chg_date")
    private Long lastChgDate;

    /**
     * First registered user ID (FK reference)
     */
    @JsonProperty("frst_reg_user_id")
    private String frstRegUserId;

    /**
     * Last modified user ID (FK reference)
     */
    @JsonProperty("last_reg_user_id")
    private String lastRegUserId;

    /**
     * Creator user name (joined from users table)
     */
    @JsonProperty("creator")
    private String creator;

    /**
     * Last modifier user name (joined from users table)
     */
    @JsonProperty("last_modifier")
    private String lastModifier;

    /**
     * Count of jobs in this group
     */
    @JsonProperty("job_count")
    private Integer jobCount;

    /**
     * Count of users assigned to this group
     */
    @JsonProperty("user_count")
    private Integer userCount;
}
