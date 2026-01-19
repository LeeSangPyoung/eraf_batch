package com.tes.batch.scheduler.agent;

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
}
