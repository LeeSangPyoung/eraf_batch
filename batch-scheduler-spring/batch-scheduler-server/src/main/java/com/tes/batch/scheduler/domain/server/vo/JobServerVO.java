package com.tes.batch.scheduler.domain.server.vo;

import lombok.*;

/**
 * Job Server VO for execution servers.
 * Maps to scheduler_job_servers table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobServerVO {

    private String systemId;
    private String systemName;
    private String hostName;
    private String hostIpAddr;
    private String secondaryHostIpAddr;
    private String systemComments;

    /**
     * Queue name for Redis Pub/Sub routing.
     * Auto-generated from system_id on creation.
     */
    private String queueName;

    /**
     * Folder path for agent deployment on primary host.
     */
    private String folderPath;

    /**
     * Folder path for agent deployment on secondary host.
     */
    private String secondaryFolderPath;

    /**
     * SSH username for agent deployment.
     */
    private String sshUser;

    /**
     * Agent status: ONLINE, OFFLINE, UNKNOWN
     */
    @Builder.Default
    private String agentStatus = "UNKNOWN";

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
