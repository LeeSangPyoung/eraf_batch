package com.tes.batch.scheduler.domain.server.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class ServerRequest {
    @JsonAlias("system_id")
    private String systemId;
    @JsonAlias("system_name")
    private String systemName;
    @JsonAlias("host_name")
    private String hostName;
    @JsonAlias("host_ip_addr")
    private String hostIpAddr;
    @JsonAlias("secondary_host_ip_addr")
    private String secondaryHostIpAddr;
    @JsonAlias("system_comments")
    private String systemComments;
    @JsonAlias("folder_path")
    private String folderPath;
    @JsonAlias("secondary_folder_path")
    private String secondaryFolderPath;
    @JsonAlias("ssh_user")
    private String sshUser;
    @JsonAlias("agent_port")
    private Integer agentPort;
    @JsonAlias("frst_reg_user_id")
    private String frstRegUserId;
    @JsonAlias("last_reg_user_id")
    private String lastRegUserId;
}
