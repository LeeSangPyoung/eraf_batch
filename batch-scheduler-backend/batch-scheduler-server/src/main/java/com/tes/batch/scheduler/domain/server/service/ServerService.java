package com.tes.batch.scheduler.domain.server.service;

import com.tes.batch.common.enums.DeploymentType;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.server.dto.ServerFilterRequest;
import com.tes.batch.scheduler.domain.server.dto.ServerRequest;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.security.SecurityUtils;
import com.tes.batch.scheduler.ssh.SshService;
import com.tes.batch.scheduler.agent.AgentManager;
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
    private final AgentManager agentManager;

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
        // Sanitize request fields (trim whitespace)
        sanitizeRequest(request);

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
                .systemComments(request.getSystemComments())
                .queueName(queueName)
                .folderPath(request.getFolderPath())
                .sshUser(sshUser)
                .sshPassword(request.getSshPassword())
                .agentPort(agentPort)
                .deploymentType(request.getDeploymentType())
                .mountPaths(request.getMountPaths())
                .agentStatus("UNKNOWN")
                .frstRegDate(now)
                .lastChgDate(now)
                .frstRegUserId(currentUserId)
                .lastRegUserId(currentUserId)
                .build();

        // Check for duplicate agent port on the same host
        JobServerVO existingServer = serverMapper.findByHostAndPort(hostIpAddr, agentPort);
        if (existingServer != null) {
            throw new IllegalArgumentException(
                String.format("Agent port %d is already in use on host %s by server '%s'. Please use a different port.",
                    agentPort, hostIpAddr, existingServer.getSystemName())
            );
        }

        // Validate server requirements BEFORE inserting into database
        // (e.g., check Java installation for JAR deployment)
        try {
            agentManager.validateServerRequirements(server);
        } catch (Exception e) {
            log.error("Server validation failed for {}: {}", server.getSystemName(), e.getMessage());
            throw new RuntimeException(e.getMessage(), e);
        }

        // Insert server after validation passes
        serverMapper.insert(server);

        // Deploy and start agent on primary host
        try {
            if (hostIpAddr != null && request.getFolderPath() != null) {
                log.info("Starting agent deployment to {}@{} using {} deployment",
                    sshUser, hostIpAddr, server.getDeploymentType());

                // Deploy and start agent using AgentManager (handles both JAR and Docker)
                agentManager.deployAndStartAgent(server.getSystemId(), null);

                server.setAgentStatus("ONLINE");
                serverMapper.updateAgentStatus(server.getSystemId(), "ONLINE");
                log.info("Agent deployment completed successfully for {}", server.getSystemName());
            } else {
                log.warn("Skipping deployment: hostIpAddr={}, folderPath={}", hostIpAddr, request.getFolderPath());
            }
        } catch (Exception e) {
            log.error("Failed to deploy worker to primary host: {}", e.getMessage(), e);
            server.setAgentStatus("OFFLINE");
            serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
        }
        return server;
    }

    @Transactional
    public JobServerVO updateServer(ServerRequest request) {
        // Sanitize request fields (trim whitespace)
        sanitizeRequest(request);

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
        existing.setSystemComments(request.getSystemComments());
        existing.setFolderPath(request.getFolderPath());
        existing.setSshUser(request.getSshUser());
        existing.setSshPassword(request.getSshPassword());
        if (request.getAgentPort() != null && request.getAgentPort() >= 1024) {
            existing.setAgentPort(request.getAgentPort());
        }
        if (request.getDeploymentType() != null) {
            existing.setDeploymentType(request.getDeploymentType());
        }
        existing.setMountPaths(request.getMountPaths());
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
            // Use AgentManager for deployment-type aware stop
            agentManager.stopAgent(server.getSystemId(), null);
            serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
            log.info("Stopped worker for {}", systemName);
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
            // Use AgentManager for deployment-type aware start
            agentManager.startAgent(server.getSystemId(), null);
            serverMapper.updateAgentStatus(server.getSystemId(), "ONLINE");

            // Reset RUNNING/WAITING jobs to SCHEDULED so they can be picked up again
            int resetCount = jobMapper.resetStuckJobsBySystemId(server.getSystemId());
            if (resetCount > 0) {
                log.info("Reset {} stuck job(s) to SCHEDULED after agent start: {}", resetCount, systemName);
            }

            log.info("Started worker for {}", systemName);
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
        redeployServer(systemName, null);
    }

    /**
     * Redeploy worker with deployment type transition support
     * @param systemName Server system name
     * @param previousDeploymentType Previous deployment type (for cleanup during type transition)
     */
    @Transactional
    public void redeployServer(String systemName, DeploymentType previousDeploymentType) {
        JobServerVO server = serverMapper.findBySystemName(systemName);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemName);
        }

        try {
            // If deployment type changed, cleanup previous deployment first
            if (previousDeploymentType != null && previousDeploymentType != server.getDeploymentType()) {
                log.info("Deployment type transition detected: {} -> {}", previousDeploymentType, server.getDeploymentType());
                try {
                    agentManager.cleanupPreviousDeployment(server.getSystemId(), previousDeploymentType, null);
                } catch (Exception e) {
                    log.warn("Failed to cleanup previous deployment (may not exist): {}", e.getMessage());
                }
            } else {
                // Same deployment type - just stop current agent
                try {
                    agentManager.stopAgent(server.getSystemId(), null);
                    Thread.sleep(2000); // Wait for clean shutdown
                } catch (Exception e) {
                    log.warn("Failed to stop agent (may not be running): {}", e.getMessage());
                }
            }

            // Deploy and start using AgentManager (deployment-type aware)
            agentManager.deployAndStartAgent(server.getSystemId(), null);
            serverMapper.updateAgentStatus(server.getSystemId(), "ONLINE");

            // Reset RUNNING/WAITING/BROKEN jobs to SCHEDULED so they can be picked up again
            int resetCount = jobMapper.resetStuckJobsBySystemId(server.getSystemId());
            if (resetCount > 0) {
                log.info("Reset {} stuck job(s) to SCHEDULED after agent redeploy: {}", resetCount, systemName);
            }

            log.info("Redeployed worker for {} ({})", systemName, server.getDeploymentType());
        } catch (Exception e) {
            log.error("Failed to redeploy worker for {}: {}", systemName, e.getMessage());
            serverMapper.updateAgentStatus(server.getSystemId(), "OFFLINE");
            throw new RuntimeException("Failed to redeploy worker: " + e.getMessage());
        }
    }

    /**
     * Delete server with proper deployment cleanup
     */
    @Transactional
    public void deleteServerWithCleanup(String systemId) {
        JobServerVO existing = serverMapper.findById(systemId);
        if (existing == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        // Delete deployment (stops and removes all files based on deployment type)
        try {
            if (existing.getHostIpAddr() != null && existing.getFolderPath() != null) {
                agentManager.deleteDeployment(systemId, null);
            }
        } catch (Exception e) {
            log.error("Failed to delete deployment for {}: {}", existing.getSystemName(), e.getMessage());
            // Continue with DB deletion even if deployment cleanup fails
        }

        serverMapper.delete(systemId);
        log.info("Deleted server: {}", existing.getSystemName());
    }

    /**
     * Sanitize request fields by trimming whitespace
     * Prevents issues like leading/trailing spaces in paths
     */
    private void sanitizeRequest(ServerRequest request) {
        if (request.getSystemName() != null) {
            request.setSystemName(request.getSystemName().trim());
        }
        if (request.getHostName() != null) {
            request.setHostName(request.getHostName().trim());
        }
        if (request.getHostIpAddr() != null) {
            request.setHostIpAddr(request.getHostIpAddr().trim());
        }
        if (request.getFolderPath() != null) {
            request.setFolderPath(request.getFolderPath().trim());
        }
        if (request.getSshUser() != null) {
            request.setSshUser(request.getSshUser().trim());
        }
        if (request.getMountPaths() != null) {
            request.setMountPaths(request.getMountPaths().trim());
        }
    }
}
