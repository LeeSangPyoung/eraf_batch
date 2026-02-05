package com.tes.batch.scheduler.domain.server.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tes.batch.common.enums.DeploymentType;
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

    @JsonProperty("id")
    private String systemId;
    @JsonProperty("name")
    private String systemName;
    @JsonProperty("host_name")
    private String hostName;
    @JsonProperty("host_ip_addr")
    private String hostIpAddr;
    @JsonProperty("system_comments")
    private String systemComments;

    /**
     * Queue name for Redis Pub/Sub routing.
     * Auto-generated from system_id on creation.
     */
    @JsonProperty("queue_name")
    private String queueName;

    /**
     * Folder path for agent deployment.
     */
    @JsonProperty("folder_path")
    private String folderPath;

    /**
     * SSH username for agent deployment.
     */
    @JsonProperty("ssh_user")
    private String sshUser;

    /**
     * SSH password for password-based authentication.
     * If null, SSH key-based authentication will be used.
     */
    @JsonProperty("ssh_password")
    private String sshPassword;

    /**
     * Agent status: ONLINE, OFFLINE, UNKNOWN
     */
    @Builder.Default
    @JsonProperty("agent_status")
    private String agentStatus = "UNKNOWN";

    /**
     * Actual heartbeat health status from Redis.
     * true = heartbeat received, false = no heartbeat
     */
    @Builder.Default
    @JsonProperty("is_healthy")
    private Boolean isHealthy = false;

    /**
     * Agent HTTP port for health endpoint.
     * Each agent on the same host should use a different port.
     */
    @Builder.Default
    @JsonProperty("agent_port")
    private Integer agentPort = 8081;

    /**
     * Agent deployment type: JAR or DOCKER
     */
    @Builder.Default
    @JsonProperty("deployment_type")
    private DeploymentType deploymentType = DeploymentType.JAR;

    /**
     * Mount paths for Docker deployment.
     * Comma-separated list of host paths to mount into the agent container.
     * Example: /workspace,/home/tangosvc/scripts
     * If empty/null, folderPath will be mounted by default.
     */
    @JsonProperty("mount_paths")
    private String mountPaths;

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
}
