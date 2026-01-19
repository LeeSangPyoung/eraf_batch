package com.tes.batch.scheduler.domain.server.dto;

import lombok.Data;

@Data
public class ServerRequest {
    private String systemId;
    private String systemName;
    private String hostName;
    private String hostIpAddr;
    private String secondaryHostIpAddr;
    private String systemComments;
    private String folderPath;
    private String secondaryFolderPath;
    private String sshUser;
}
