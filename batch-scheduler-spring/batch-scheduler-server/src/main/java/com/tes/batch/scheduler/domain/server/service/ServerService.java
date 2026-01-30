package com.tes.batch.scheduler.domain.server.service;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.server.dto.ServerFilterRequest;
import com.tes.batch.scheduler.domain.server.dto.ServerRequest;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.security.SecurityUtils;
import com.tes.batch.scheduler.ssh.SshService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServerService {

    private final JobServerMapper serverMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final JobMapper jobMapper;
    private final SecurityUtils securityUtils;
    private final SshService sshService;

    @Transactional(readOnly = true)
    public List<JobServerVO> getServers(ServerFilterRequest request) {
        int offset = request.getPage() * request.getSize();
        return serverMapper.findByFilters(request.getTextSearch(), request.getSize(), offset);
    }

    @Transactional(readOnly = true)
    public long countServers(ServerFilterRequest request) {
        return serverMapper.countByFilters(request.getTextSearch());
    }

    @Transactional(readOnly = true)
    public List<JobServerVO> getAllServers() {
        return serverMapper.findAll();
    }

    @Transactional(readOnly = true)
    public JobServerVO getServer(String systemId) {
        return serverMapper.findById(systemId);
    }

    @Transactional
    public JobServerVO createServer(ServerRequest request) {
        if (serverMapper.existsBySystemName(request.getSystemName())) {
            throw new IllegalArgumentException("System name already exists: " + request.getSystemName());
        }

        long now = System.currentTimeMillis();
        String currentUserId = securityUtils.getCurrentId();
        String systemId = UUID.randomUUID().toString();
        String queueName = systemId.replace("-", "");

        // Parse SSH user from host_ip_addr if format is user@host
        String hostIpAddr = request.getHostIpAddr();
        String sshUser = request.getSshUser();
        if (hostIpAddr != null && hostIpAddr.contains("@")) {
            String[] parts = hostIpAddr.split("@", 2);
            sshUser = parts[0];
            hostIpAddr = parts[1];
        }

        // Calculate agent port: use provided value or generate from queueName
        Integer agentPort = request.getAgentPort();
        if (agentPort == null || agentPort < 1024) {
            agentPort = 8081 + (Math.abs(queueName.hashCode()) % 919);
        }

        JobServerVO server = JobServerVO.builder()
                .systemId(systemId)
                .systemName(request.getSystemName())
                .hostName(request.getHostName())
                .hostIpAddr(hostIpAddr)
                .secondaryHostIpAddr(request.getSecondaryHostIpAddr())
                .systemComments(request.getSystemComments())
                .queueName(queueName)
                .folderPath(request.getFolderPath())
                .secondaryFolderPath(request.getSecondaryFolderPath())
                .sshUser(sshUser)
                .agentPort(agentPort)
                .agentStatus("UNKNOWN")
                .frstRegDate(now)
                .lastChgDate(now)
                .frstRegUserId(currentUserId)
                .lastRegUserId(currentUserId)
                .build();

        // Deploy worker to primary host
        try {
            if (hostIpAddr != null && request.getFolderPath() != null) {
                log.info("Starting agent deployment to {}@{}", sshUser, hostIpAddr);
                sshService.deployWorker(hostIpAddr, sshUser, request.getFolderPath(), queueName, agentPort);
                server.setAgentStatus("ONLINE");
                log.info("Agent deployment completed successfully");
            } else {
                log.warn("Skipping deployment: hostIpAddr={}, folderPath={}", hostIpAddr, request.getFolderPath());
            }
        } catch (Exception e) {
            log.error("Failed to deploy worker to primary host: {}", e.getMessage(), e);
            server.setAgentStatus("OFFLINE");
        }

        // Deploy worker to secondary host if exists
        try {
            String secondaryHost = request.getSecondaryHostIpAddr();
            String secondaryFolder = request.getSecondaryFolderPath();
            if (secondaryHost != null && !secondaryHost.isEmpty() &&
                secondaryFolder != null && !secondaryFolder.isEmpty()) {
                sshService.deployWorker(secondaryHost, sshUser, secondaryFolder, queueName, agentPort);
            }
        } catch (Exception e) {
            log.error("Failed to deploy worker to secondary host: {}", e.getMessage());
        }

        serverMapper.insert(server);
        return server;
    }

    @Transactional
    public JobServerVO updateServer(ServerRequest request) {
        JobServerVO existing = serverMapper.findById(request.getSystemId());
        if (existing == null) {
            throw new IllegalArgumentException("Server not found: " + request.getSystemId());
        }

        // Check for duplicate name
        JobServerVO byName = serverMapper.findBySystemName(request.getSystemName());
        if (byName != null && !byName.getSystemId().equals(request.getSystemId())) {
            throw new IllegalArgumentException("System name already exists: " + request.getSystemName());
        }

        existing.setSystemName(request.getSystemName());
        existing.setHostName(request.getHostName());
        existing.setHostIpAddr(request.getHostIpAddr());
        existing.setSecondaryHostIpAddr(request.getSecondaryHostIpAddr());
        existing.setSystemComments(request.getSystemComments());
        existing.setFolderPath(request.getFolderPath());
        existing.setSecondaryFolderPath(request.getSecondaryFolderPath());
        existing.setSshUser(request.getSshUser());
        if (request.getAgentPort() != null && request.getAgentPort() >= 1024) {
            existing.setAgentPort(request.getAgentPort());
        }
        existing.setLastChgDate(System.currentTimeMillis());
        existing.setLastRegUserId(securityUtils.getCurrentId());

        serverMapper.update(existing);
        return existing;
    }

    @Transactional
    public void deleteServer(String systemId) {
        JobServerVO existing = serverMapper.findById(systemId);
        if (existing == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        // Stop and clean worker on primary host
        try {
            if (existing.getHostIpAddr() != null && existing.getFolderPath() != null) {
                sshService.stopWorker(existing.getHostIpAddr(), existing.getSshUser(), existing.getFolderPath());
                sshService.cleanWorkerFolder(existing.getHostIpAddr(), existing.getSshUser(), existing.getFolderPath());
            }
        } catch (Exception e) {
            log.error("Failed to stop/clean worker on primary host: {}", e.getMessage());
        }

        // Stop and clean worker on secondary host
        try {
            if (existing.getSecondaryHostIpAddr() != null && existing.getSecondaryFolderPath() != null) {
                sshService.stopWorker(existing.getSecondaryHostIpAddr(), existing.getSshUser(), existing.getSecondaryFolderPath());
                sshService.cleanWorkerFolder(existing.getSecondaryHostIpAddr(), existing.getSshUser(), existing.getSecondaryFolderPath());
            }
        } catch (Exception e) {
            log.error("Failed to stop/clean worker on secondary host: {}", e.getMessage());
        }

        serverMapper.delete(systemId);
    }

    @Transactional
    public void updateAgentStatus(String systemId, String status) {
        serverMapper.updateAgentStatus(systemId, status);
    }

    /**
     * Stop worker - just stops the agent, doesn't change job states
     */
    public void stopServer(String systemName) {
        JobServerVO server = serverMapper.findBySystemName(systemName);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemName);
        }

        try {
            if (server.getHostIpAddr() != null && server.getFolderPath() != null) {
                sshService.stopWorker(server.getHostIpAddr(), server.getSshUser(), server.getFolderPath());
                serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
                log.info("Stopped worker for {}", systemName);
            }
        } catch (Exception e) {
            log.error("Failed to stop worker for {}: {}", systemName, e.getMessage());
            throw new RuntimeException("Failed to stop worker: " + e.getMessage());
        }
    }

    /**
     * Start worker - starts the agent and resets stuck jobs to SCHEDULED
     */
    @Transactional
    public void startServer(String systemName) {
        JobServerVO server = serverMapper.findBySystemName(systemName);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemName);
        }

        try {
            if (server.getHostIpAddr() != null && server.getFolderPath() != null) {
                sshService.startWorker(server.getHostIpAddr(), server.getSshUser(), server.getFolderPath());
                serverMapper.updateAgentStatus(server.getSystemId(), "ONLINE");

                // Reset RUNNING/WAITING jobs to SCHEDULED so they can be picked up again
                int resetCount = jobMapper.resetStuckJobsBySystemId(server.getSystemId());
                if (resetCount > 0) {
                    log.info("Reset {} stuck job(s) to SCHEDULED after agent start: {}", resetCount, systemName);
                }

                log.info("Started worker for {}", systemName);
            }
        } catch (Exception e) {
            log.error("Failed to start worker for {}: {}", systemName, e.getMessage());
            serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
            throw new RuntimeException("Failed to start worker: " + e.getMessage());
        }
    }

    /**
     * Redeploy worker (stop, deploy, start) - also resets stuck jobs like start
     */
    @Transactional
    public void redeployServer(String systemName) {
        JobServerVO server = serverMapper.findBySystemName(systemName);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemName);
        }

        try {
            if (server.getHostIpAddr() != null && server.getFolderPath() != null) {
                // Stop first
                sshService.stopWorker(server.getHostIpAddr(), server.getSshUser(), server.getFolderPath());
                // Deploy and start
                sshService.deployWorker(server.getHostIpAddr(), server.getSshUser(),
                        server.getFolderPath(), server.getQueueName(), server.getAgentPort());
                serverMapper.updateAgentStatus(server.getSystemId(), "ONLINE");

                // Reset RUNNING/WAITING/BROKEN jobs to SCHEDULED so they can be picked up again
                int resetCount = jobMapper.resetStuckJobsBySystemId(server.getSystemId());
                if (resetCount > 0) {
                    log.info("Reset {} stuck job(s) to SCHEDULED after agent redeploy: {}", resetCount, systemName);
                }

                log.info("Redeployed worker for {}", systemName);
            }
        } catch (Exception e) {
            log.error("Failed to redeploy worker for {}: {}", systemName, e.getMessage());
            serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
            throw new RuntimeException("Failed to redeploy worker: " + e.getMessage());
        }
    }
}
