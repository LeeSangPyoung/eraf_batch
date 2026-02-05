package com.tes.batch.scheduler.agent;

import com.tes.batch.common.enums.DeploymentType;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Manages Agent lifecycle (deploy, start, stop)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentManager {

    private final AgentDeployer agentDeployer;
    private final JobServerMapper serverMapper;

    /**
     * Validate server requirements before registration (e.g., Java for JAR deployment)
     */
    public void validateServerRequirements(JobServerVO server) throws Exception {
        log.info("Validating server requirements for: {} ({})", server.getSystemName(), server.getDeploymentType());
        agentDeployer.validateRequirements(server);
        log.info("Server requirements validation passed for: {}", server.getSystemName());
    }

    /**
     * Deploy and start agent on server
     */
    public void deployAndStartAgent(String systemId, String privateKeyPath) {
        JobServerVO server = serverMapper.findById(systemId);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        try {
            log.info("Deploying agent to server: {}", server.getSystemName());

            // Deploy agent
            agentDeployer.deployAgent(server, privateKeyPath);

            // Start agent
            agentDeployer.startAgent(server, privateKeyPath);

            // Update status
            serverMapper.updateAgentStatus(systemId, "STARTING");

            log.info("Agent deployment initiated for: {}", server.getSystemName());

        } catch (Exception e) {
            log.error("Failed to deploy agent to server: {}", server.getSystemName(), e);
            serverMapper.updateAgentStatus(systemId, "DEPLOY_FAILED");
            throw new RuntimeException("Agent deployment failed: " + e.getMessage(), e);
        }
    }

    /**
     * Start existing agent on server
     */
    public void startAgent(String systemId, String privateKeyPath) {
        JobServerVO server = serverMapper.findById(systemId);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        try {
            agentDeployer.startAgent(server, privateKeyPath);
            serverMapper.updateAgentStatus(systemId, "STARTING");
            log.info("Agent start initiated for: {}", server.getSystemName());

        } catch (Exception e) {
            log.error("Failed to start agent on server: {}", server.getSystemName(), e);
            throw new RuntimeException("Agent start failed: " + e.getMessage(), e);
        }
    }

    /**
     * Stop agent on server
     */
    public void stopAgent(String systemId, String privateKeyPath) {
        JobServerVO server = serverMapper.findById(systemId);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        try {
            agentDeployer.stopAgent(server, privateKeyPath);
            serverMapper.updateAgentStatus(systemId, "STOPPING");
            log.info("Agent stop initiated for: {}", server.getSystemName());

        } catch (Exception e) {
            log.error("Failed to stop agent on server: {}", server.getSystemName(), e);
            throw new RuntimeException("Agent stop failed: " + e.getMessage(), e);
        }
    }

    /**
     * Restart agent on server
     */
    public void restartAgent(String systemId, String privateKeyPath) {
        stopAgent(systemId, privateKeyPath);

        // Wait a bit before starting
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        startAgent(systemId, privateKeyPath);
    }

    /**
     * Cleanup previous deployment when switching deployment types
     */
    public void cleanupPreviousDeployment(String systemId, DeploymentType previousType, String privateKeyPath) {
        JobServerVO server = serverMapper.findById(systemId);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        try {
            log.info("Cleaning up previous {} deployment for: {}", previousType, server.getSystemName());
            agentDeployer.cleanupPreviousDeployment(server, previousType, privateKeyPath);
            log.info("Previous deployment cleanup completed for: {}", server.getSystemName());

        } catch (Exception e) {
            log.error("Failed to cleanup previous deployment for server: {}", server.getSystemName(), e);
            throw new RuntimeException("Previous deployment cleanup failed: " + e.getMessage(), e);
        }
    }

    /**
     * Delete deployment completely (for server deletion)
     */
    public void deleteDeployment(String systemId, String privateKeyPath) {
        JobServerVO server = serverMapper.findById(systemId);
        if (server == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }

        try {
            log.info("Deleting deployment for: {}", server.getSystemName());
            agentDeployer.deleteDeployment(server, privateKeyPath);
            log.info("Deployment deleted for: {}", server.getSystemName());

        } catch (Exception e) {
            log.error("Failed to delete deployment for server: {}", server.getSystemName(), e);
            throw new RuntimeException("Deployment deletion failed: " + e.getMessage(), e);
        }
    }
}
