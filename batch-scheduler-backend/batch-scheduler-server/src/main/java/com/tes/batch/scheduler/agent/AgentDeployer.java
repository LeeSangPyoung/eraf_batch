package com.tes.batch.scheduler.agent;

import com.jcraft.jsch.*;
import com.tes.batch.common.enums.DeploymentType;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.Properties;

/**
 * Deploys Agent to remote servers via SSH/SCP
 * Supports both JAR and Docker deployment methods
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentDeployer {

    @Value("${app.agent.jar-path:./batch-scheduler-agent.jar}")
    private String agentJarPath;

    @Value("${app.agent.docker-image:batch-scheduler-agent:latest}")
    private String dockerImageName;

    @Value("${app.agent.docker-image-path:./batch-scheduler-agent.tar.gz}")
    private String dockerImagePath;

    @Value("${app.agent.redis-host}")
    private String agentRedisHost;

    @Value("${app.agent.redis-port}")
    private int agentRedisPort;

    @Value("${app.scheduler.external-url}")
    private String schedulerExternalUrl;

    @Value("${ssh.keys-path:./keys}")
    private String sshKeysPath;

    @Value("${ssh.default-username:root}")
    private String defaultSshUsername;

    private static final int SSH_PORT = 22;
    private static final int TIMEOUT = 30000;

    /**
     * Validate server requirements before deployment (e.g., Java for JAR, port availability)
     */
    public void validateRequirements(JobServerVO server) throws Exception {
        Session session = null;
        try {
            session = createSession(server, null);
            session.connect(TIMEOUT);

            // Check Java for JAR deployment (Docker includes Java)
            if (server.getDeploymentType() == DeploymentType.JAR) {
                log.info("Validating Java installation for JAR deployment on: {}", server.getHostIpAddr());
                checkJavaVersion(session);
            } else {
                log.info("Skipping Java validation for Docker deployment (Java included in image)");
            }

            // Check port availability for all deployment types
            int agentPort = server.getAgentPort() != null ? server.getAgentPort() : 8081;
            log.info("Checking port {} availability on: {}", agentPort, server.getHostIpAddr());
            checkPortAvailability(session, agentPort);

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Check if the specified port is available (not in use)
     */
    private void checkPortAvailability(Session session, int port) throws Exception {
        log.info("Checking if port {} is available on remote server...", port);

        ChannelExec channel = null;
        try {
            channel = (ChannelExec) session.openChannel("exec");
            // Use ss command (modern) with fallback behavior
            channel.setCommand("ss -tlnp 2>/dev/null | grep ':" + port + " ' || netstat -tlnp 2>/dev/null | grep ':" + port + " ' || echo 'PORT_FREE'");
            channel.setInputStream(null);

            InputStream in = channel.getInputStream();
            channel.connect(TIMEOUT);

            // Read output
            StringBuilder output = new StringBuilder();
            byte[] buffer = new byte[1024];
            while (true) {
                while (in.available() > 0) {
                    int len = in.read(buffer, 0, 1024);
                    if (len < 0) break;
                    output.append(new String(buffer, 0, len));
                }
                if (channel.isClosed()) {
                    break;
                }
                Thread.sleep(100);
            }

            String result = output.toString().trim();
            log.debug("Port check result for port {}: {}", port, result);

            if (!result.contains("PORT_FREE") && !result.isEmpty()) {
                throw new RuntimeException(
                    String.format(
                        "Port %d is already in use on the target server. " +
                        "Details: %s. " +
                        "Please choose a different port or stop the existing service.",
                        port, result.replace("\n", " ")
                    )
                );
            }

            log.info("Port {} is available", port);

        } finally {
            if (channel != null) {
                channel.disconnect();
            }
        }
    }

    /**
     * Deploy agent to server (routes to JAR or Docker deployment based on server config)
     */
    public void deployAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Deploying agent to server: {} ({}) using {} deployment",
                server.getSystemName(), server.getHostIpAddr(), server.getDeploymentType());

        switch (server.getDeploymentType()) {
            case JAR -> deployAgentJar(server, privateKeyPath);
            case DOCKER -> deployAgentDocker(server, privateKeyPath);
            default -> throw new IllegalArgumentException("Unsupported deployment type: " + server.getDeploymentType());
        }
    }

    /**
     * Start agent on remote server (routes to JAR or Docker start based on server config)
     */
    public void startAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Starting agent on server: {} using {} deployment",
                server.getSystemName(), server.getDeploymentType());

        switch (server.getDeploymentType()) {
            case JAR -> startAgentJar(server, privateKeyPath);
            case DOCKER -> startAgentDocker(server, privateKeyPath);
            default -> throw new IllegalArgumentException("Unsupported deployment type: " + server.getDeploymentType());
        }
    }

    /**
     * Stop agent on remote server (routes to JAR or Docker stop based on server config)
     */
    public void stopAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Stopping agent on server: {} using {} deployment",
                server.getSystemName(), server.getDeploymentType());

        switch (server.getDeploymentType()) {
            case JAR -> stopAgentJar(server, privateKeyPath);
            case DOCKER -> stopAgentDocker(server, privateKeyPath);
            default -> throw new IllegalArgumentException("Unsupported deployment type: " + server.getDeploymentType());
        }
    }

    // ========== JAR DEPLOYMENT METHODS ==========

    /**
     * Deploy agent as JAR file
     */
    private void deployAgentJar(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            // Check Java availability and version
            checkJavaVersion(session);

            // Create target directory
            String targetDir = server.getFolderPath();
            if (targetDir == null || targetDir.isEmpty()) {
                targetDir = "/opt/batch-agent";
            }

            executeCommand(session, "mkdir -p " + targetDir);

            // Upload agent JAR
            String agentJarName = "batch-scheduler-agent.jar";
            uploadFile(session, agentJarPath, targetDir + "/" + agentJarName);

            // Generate and upload configuration
            String config = generateAgentConfig(server);
            uploadContent(session, config, targetDir + "/application.yml");

            // Generate and upload .env file
            String envFile = generateJarEnvFile(server);
            uploadContent(session, envFile, targetDir + "/.env");

            // Generate and upload start script
            String startScript = generateJarStartScript(targetDir, agentJarName);
            uploadContent(session, startScript, targetDir + "/start-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/start-agent.sh");

            // Generate and upload stop script
            String stopScript = generateJarStopScript(targetDir);
            uploadContent(session, stopScript, targetDir + "/stop-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/stop-agent.sh");

            log.info("Agent JAR deployed successfully to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Start agent JAR on remote server
     */
    private void startAgentJar(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/start-agent.sh");

            log.info("Agent JAR start command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Stop agent JAR on remote server
     */
    private void stopAgentJar(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/stop-agent.sh");

            log.info("Agent JAR stop command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    // ========== DOCKER DEPLOYMENT METHODS ==========

    /**
     * Deploy agent as Docker container
     */
    private void deployAgentDocker(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            // Create target directory
            String targetDir = server.getFolderPath();
            if (targetDir == null || targetDir.isEmpty()) {
                targetDir = "/opt/batch-agent";
            }

            executeCommand(session, "mkdir -p " + targetDir);

            // Upload Docker image tar.gz
            String imageFileName = "batch-scheduler-agent.tar.gz";
            uploadFile(session, dockerImagePath, targetDir + "/" + imageFileName);

            // Load Docker image
            log.info("Loading Docker image on remote server...");
            executeCommand(session, "cd " + targetDir + " && docker load < " + imageFileName);

            // Generate and upload .env file
            String envFile = generateDockerEnvFile(server);
            uploadContent(session, envFile, targetDir + "/.env");

            // Generate and upload docker-compose.yml
            String composeFile = generateDockerComposeFile(server);
            uploadContent(session, composeFile, targetDir + "/docker-compose.yml");

            // Generate and upload start script
            String startScript = generateDockerStartScript(targetDir);
            uploadContent(session, startScript, targetDir + "/start-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/start-agent.sh");

            // Generate and upload stop script
            String stopScript = generateDockerStopScript(targetDir);
            uploadContent(session, stopScript, targetDir + "/stop-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/stop-agent.sh");

            log.info("Agent Docker image deployed successfully to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Start agent Docker container on remote server
     */
    private void startAgentDocker(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/start-agent.sh");

            log.info("Agent Docker start command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Stop agent Docker container on remote server
     */
    private void stopAgentDocker(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/stop-agent.sh");

            log.info("Agent Docker stop command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    // ========== CLEANUP METHODS FOR DEPLOYMENT TYPE TRANSITION ==========

    /**
     * Cleanup previous deployment when switching deployment types
     * JAR -> Docker: stop JAR process, delete JAR files
     * Docker -> JAR: stop Docker container, remove container
     */
    public void cleanupPreviousDeployment(JobServerVO server, DeploymentType previousType, String privateKeyPath) throws Exception {
        if (previousType == null || previousType == server.getDeploymentType()) {
            log.info("No deployment type transition detected, skipping cleanup");
            return;
        }

        log.info("Cleaning up previous {} deployment for transition to {} on server: {}",
                previousType, server.getDeploymentType(), server.getSystemName());

        switch (previousType) {
            case JAR -> cleanupJarDeployment(server, privateKeyPath);
            case DOCKER -> cleanupDockerDeployment(server, privateKeyPath);
            default -> log.warn("Unknown previous deployment type: {}", previousType);
        }
    }

    /**
     * Cleanup JAR deployment: stop process, delete JAR and related files
     */
    private void cleanupJarDeployment(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";

            // 1. Stop JAR process
            log.info("Stopping JAR process...");
            try {
                executeCommand(session, targetDir + "/stop-agent.sh");
            } catch (Exception e) {
                log.warn("Failed to stop JAR process (may not be running): {}", e.getMessage());
            }

            // Wait for process to fully stop
            Thread.sleep(2000);

            // 2. Kill any remaining java process using PID file
            log.info("Cleaning up any remaining processes...");
            executeCommand(session, "if [ -f " + targetDir + "/agent.pid ]; then kill $(cat " + targetDir + "/agent.pid) 2>/dev/null || true; rm -f " + targetDir + "/agent.pid; fi");

            // 3. Delete JAR deployment files (keep logs directory)
            log.info("Deleting JAR deployment files...");
            executeCommand(session, "rm -f " + targetDir + "/batch-scheduler-agent.jar");
            executeCommand(session, "rm -f " + targetDir + "/application.yml");
            executeCommand(session, "rm -f " + targetDir + "/.env");
            executeCommand(session, "rm -f " + targetDir + "/start-agent.sh");
            executeCommand(session, "rm -f " + targetDir + "/stop-agent.sh");

            log.info("JAR deployment cleanup completed for: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Cleanup Docker deployment: stop container, remove container and images
     */
    private void cleanupDockerDeployment(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            String containerName = "batch-agent-" + server.getSystemName().toLowerCase().replaceAll("[^a-z0-9-]", "-");

            // 1. Stop Docker container using docker-compose
            log.info("Stopping Docker container...");
            try {
                executeCommand(session, "cd " + targetDir + " && docker compose down 2>/dev/null || true");
            } catch (Exception e) {
                log.warn("Failed to stop Docker container via compose: {}", e.getMessage());
            }

            // Wait for container to fully stop
            Thread.sleep(2000);

            // 2. Force stop and remove container if still exists
            log.info("Cleaning up Docker container: {}", containerName);
            executeCommand(session, "docker stop " + containerName + " 2>/dev/null || true");
            executeCommand(session, "docker rm " + containerName + " 2>/dev/null || true");

            // 3. Delete Docker deployment files (keep logs directory)
            log.info("Deleting Docker deployment files...");
            executeCommand(session, "rm -f " + targetDir + "/docker-compose.yml");
            executeCommand(session, "rm -f " + targetDir + "/.env");
            executeCommand(session, "rm -f " + targetDir + "/start-agent.sh");
            executeCommand(session, "rm -f " + targetDir + "/stop-agent.sh");
            executeCommand(session, "rm -f " + targetDir + "/batch-scheduler-agent.tar.gz");

            log.info("Docker deployment cleanup completed for: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Delete deployment completely (for server deletion)
     * Handles both JAR and Docker based on current deployment type
     */
    public void deleteDeployment(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Deleting {} deployment for server: {}", server.getDeploymentType(), server.getSystemName());

        switch (server.getDeploymentType()) {
            case JAR -> deleteJarDeployment(server, privateKeyPath);
            case DOCKER -> deleteDockerDeployment(server, privateKeyPath);
            default -> log.warn("Unknown deployment type for deletion: {}", server.getDeploymentType());
        }
    }

    /**
     * Completely delete JAR deployment: stop, delete all files including directory
     */
    private void deleteJarDeployment(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";

            // 1. Stop JAR process
            log.info("Stopping JAR process...");
            try {
                executeCommand(session, targetDir + "/stop-agent.sh");
            } catch (Exception e) {
                log.warn("Failed to stop JAR process: {}", e.getMessage());
            }

            Thread.sleep(2000);

            // 2. Kill any remaining process
            executeCommand(session, "if [ -f " + targetDir + "/agent.pid ]; then kill $(cat " + targetDir + "/agent.pid) 2>/dev/null || true; fi");

            // 3. Delete entire directory
            log.info("Deleting entire deployment directory: {}", targetDir);
            executeCommand(session, "rm -rf " + targetDir);

            log.info("JAR deployment deleted for: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Completely delete Docker deployment: stop, remove container, remove image, delete files
     */
    private void deleteDockerDeployment(JobServerVO server, String privateKeyPath) throws Exception {
        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            String containerName = "batch-agent-" + server.getSystemName().toLowerCase().replaceAll("[^a-z0-9-]", "-");

            // 1. Stop Docker container
            log.info("Stopping Docker container...");
            try {
                executeCommand(session, "cd " + targetDir + " && docker compose down 2>/dev/null || true");
            } catch (Exception e) {
                log.warn("Failed to stop Docker container: {}", e.getMessage());
            }

            Thread.sleep(2000);

            // 2. Force stop and remove container
            executeCommand(session, "docker stop " + containerName + " 2>/dev/null || true");
            executeCommand(session, "docker rm " + containerName + " 2>/dev/null || true");

            // 3. Remove Docker image
            log.info("Removing Docker image: {}", dockerImageName);
            executeCommand(session, "docker rmi " + dockerImageName + " 2>/dev/null || true");

            // 4. Delete entire directory
            log.info("Deleting entire deployment directory: {}", targetDir);
            executeCommand(session, "rm -rf " + targetDir);

            log.info("Docker deployment deleted for: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    // ========== COMMON HELPER METHODS ==========

    private Session createSession(JobServerVO server, String privateKeyPath) throws JSchException {
        JSch jsch = new JSch();

        String user = server.getSshUser() != null ? server.getSshUser() : defaultSshUsername;

        // Check if password authentication is configured
        boolean usePassword = server.getSshPassword() != null && !server.getSshPassword().isEmpty();

        if (usePassword) {
            // Use password authentication
            log.info("Using SSH password authentication for user: {}", user);
        } else {
            // Load SSH private key
            if (privateKeyPath != null && !privateKeyPath.isEmpty()) {
                // Use provided key path
                File keyFile = new File(privateKeyPath);
                if (keyFile.exists()) {
                    jsch.addIdentity(privateKeyPath);
                    log.info("Using provided SSH key: {}", privateKeyPath);
                } else {
                    log.warn("Provided SSH key not found: {}", privateKeyPath);
                }
            } else {
                // Try to find key automatically
                // 1. Try user-specific key in configured keys path
                String userKeyPath = sshKeysPath + "/" + user + "/id_rsa";
                File userKeyFile = new File(userKeyPath);
                if (userKeyFile.exists()) {
                    jsch.addIdentity(userKeyPath);
                    log.info("Using user-specific SSH key: {}", userKeyFile.getAbsolutePath());
                } else {
                    // 2. Try default user home ssh key
                    String defaultKey = System.getProperty("user.home") + "/.ssh/id_rsa";
                    File defaultKeyFile = new File(defaultKey);
                    if (defaultKeyFile.exists()) {
                        jsch.addIdentity(defaultKey);
                        log.info("Using default SSH key: {}", defaultKey);
                    } else {
                        log.warn("No SSH key found! Tried: {} and {}", userKeyFile.getAbsolutePath(), defaultKey);
                    }
                }
            }
        }

        Session session = jsch.getSession(user, server.getHostIpAddr(), SSH_PORT);

        // Set password if using password authentication
        if (usePassword) {
            session.setPassword(server.getSshPassword());
        }

        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");
        if (usePassword) {
            config.put("PreferredAuthentications", "password,keyboard-interactive");
        } else {
            config.put("PreferredAuthentications", "publickey,keyboard-interactive,password");
        }
        session.setConfig(config);
        session.setTimeout(TIMEOUT);

        return session;
    }

    /**
     * Check if Java is installed and version is sufficient
     */
    private void checkJavaVersion(Session session) throws Exception {
        log.info("Checking Java installation on remote server...");

        ChannelExec channel = null;
        try {
            channel = (ChannelExec) session.openChannel("exec");
            channel.setCommand("java -version 2>&1");
            channel.setInputStream(null);

            InputStream in = channel.getInputStream();
            InputStream err = channel.getErrStream();
            channel.connect(TIMEOUT);

            // Read output
            StringBuilder output = new StringBuilder();
            byte[] buffer = new byte[1024];
            while (true) {
                while (in.available() > 0) {
                    int len = in.read(buffer, 0, 1024);
                    if (len < 0) break;
                    output.append(new String(buffer, 0, len));
                }
                while (err.available() > 0) {
                    int len = err.read(buffer, 0, 1024);
                    if (len < 0) break;
                    output.append(new String(buffer, 0, len));
                }
                if (channel.isClosed()) {
                    break;
                }
                Thread.sleep(100);
            }

            int exitCode = channel.getExitStatus();
            String result = output.toString();

            log.debug("Java version check - exit code: {}, output: {}", exitCode, result);

            if (exitCode != 0 || !result.toLowerCase().contains("version")) {
                throw new RuntimeException(
                    "Java is not installed on the target server. " +
                    "Required: Java 21 or higher. " +
                    "Alternatively, use Docker deployment type which includes Java."
                );
            }

            // Extract version number
            String version = extractJavaVersion(result);
            log.info("Java version detected: {}", version);

            // Check if version is sufficient (Java 21+)
            if (!isJavaVersionSufficient(version)) {
                throw new RuntimeException(
                    String.format(
                        "Java version %s is not supported. " +
                        "Required: Java 21 or higher. " +
                        "Alternatively, use Docker deployment type which includes Java.",
                        version
                    )
                );
            }

            log.info("Java version check passed: {}", version);

        } finally {
            if (channel != null) {
                channel.disconnect();
            }
        }
    }

    /**
     * Extract Java version from java -version output
     */
    private String extractJavaVersion(String output) {
        // Examples:
        // openjdk version "17.0.2" 2022-01-18
        // java version "1.8.0_292"
        String[] lines = output.split("\n");
        for (String line : lines) {
            if (line.contains("version")) {
                int start = line.indexOf("\"");
                int end = line.indexOf("\"", start + 1);
                if (start != -1 && end != -1) {
                    return line.substring(start + 1, end);
                }
            }
        }
        return "unknown";
    }

    /**
     * Check if Java version is sufficient (21+)
     */
    private boolean isJavaVersionSufficient(String version) {
        try {
            // Handle both formats: "21.0.2" and "1.8.0_292"
            String[] parts = version.split("[._-]");
            if (parts.length > 0) {
                int majorVersion = Integer.parseInt(parts[0]);
                // Old format: 1.8.x -> version 8
                if (majorVersion == 1 && parts.length > 1) {
                    majorVersion = Integer.parseInt(parts[1]);
                }
                return majorVersion >= 21;
            }
        } catch (NumberFormatException e) {
            log.warn("Could not parse Java version: {}", version);
        }
        return false;
    }

    private void executeCommand(Session session, String command) throws JSchException, IOException {
        ChannelExec channel = (ChannelExec) session.openChannel("exec");
        channel.setCommand(command);
        channel.setInputStream(null);
        channel.setErrStream(System.err);

        InputStream in = channel.getInputStream();
        channel.connect(TIMEOUT);

        // Read output
        byte[] buffer = new byte[1024];
        StringBuilder output = new StringBuilder();
        while (true) {
            while (in.available() > 0) {
                int len = in.read(buffer, 0, 1024);
                if (len < 0) break;
                output.append(new String(buffer, 0, len));
            }
            if (channel.isClosed()) {
                if (in.available() > 0) continue;
                break;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        int exitStatus = channel.getExitStatus();
        channel.disconnect();

        if (exitStatus != 0) {
            log.warn("Command exited with status {}: {}", exitStatus, command);
        }
    }

    private void uploadFile(Session session, String localPath, String remotePath) throws JSchException, IOException {
        ChannelSftp sftp = (ChannelSftp) session.openChannel("sftp");
        sftp.connect(TIMEOUT);

        try (FileInputStream fis = new FileInputStream(localPath)) {
            sftp.put(fis, remotePath);
        } catch (SftpException e) {
            throw new IOException("Failed to upload file: " + e.getMessage(), e);
        } finally {
            sftp.disconnect();
        }
    }

    private void uploadContent(Session session, String content, String remotePath) throws JSchException, IOException {
        ChannelSftp sftp = (ChannelSftp) session.openChannel("sftp");
        sftp.connect(TIMEOUT);

        try (ByteArrayInputStream bais = new ByteArrayInputStream(content.getBytes())) {
            sftp.put(bais, remotePath);
        } catch (SftpException e) {
            throw new IOException("Failed to upload content: " + e.getMessage(), e);
        } finally {
            sftp.disconnect();
        }
    }

    private String generateAgentConfig(JobServerVO server) {
        return """
                server:
                  port: ${AGENT_PORT}

                spring:
                  application:
                    name: batch-scheduler-agent
                  data:
                    redis:
                      host: ${REDIS_HOST}
                      port: ${REDIS_PORT}
                      timeout: 5000ms

                agent:
                  queue-name: ${AGENT_QUEUE_NAME}
                  server-id: ${AGENT_SERVER_ID}
                  heartbeat:
                    interval: 10000
                    timeout: 60000

                scheduler:
                  api-url: ${SCHEDULER_API_URL}

                management:
                  endpoints:
                    web:
                      exposure:
                        include: health,info,metrics

                logging:
                  level:
                    root: INFO
                    com.tes.batch: DEBUG
                  file:
                    name: ${LOG_PATH:/app/logs}/agent.log
                  pattern:
                    file: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
                    console: "%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
                """;
    }

    // ========== JAR SCRIPT GENERATION ==========

    private String generateJarEnvFile(JobServerVO server) {
        return """
                # Agent environment variables
                AGENT_PORT=%d
                REDIS_HOST=%s
                REDIS_PORT=%d
                AGENT_QUEUE_NAME=%s
                AGENT_SERVER_ID=%s
                SCHEDULER_API_URL=%s
                """.formatted(
                server.getAgentPort() != null ? server.getAgentPort() : 8081,
                agentRedisHost,
                agentRedisPort,
                server.getQueueName(),
                server.getSystemId(),
                schedulerExternalUrl
        );
    }

    private String generateJarStartScript(String targetDir, String jarName) {
        return """
                #!/bin/bash
                cd %s

                # Create logs directory if not exists
                mkdir -p %s/logs

                # Load environment variables
                if [ -f .env ]; then
                    export $(cat .env | grep -v '^#' | xargs)
                fi

                # Stop existing process if running
                if [ -f agent.pid ]; then
                    PID=$(cat agent.pid)
                    if ps -p $PID > /dev/null 2>&1; then
                        kill $PID
                        sleep 2
                    fi
                    rm -f agent.pid
                fi

                # Start agent with log path
                export LOG_PATH=%s/logs
                nohup java -jar %s --spring.config.location=application.yml > logs/agent-console.log 2>&1 &
                echo $! > agent.pid
                echo "Agent started with PID: $(cat agent.pid)"
                """.formatted(targetDir, targetDir, targetDir, jarName);
    }

    private String generateJarStopScript(String targetDir) {
        return """
                #!/bin/bash
                cd %s

                if [ -f agent.pid ]; then
                    PID=$(cat agent.pid)
                    if ps -p $PID > /dev/null 2>&1; then
                        kill $PID
                        echo "Agent stopped (PID: $PID)"
                    else
                        echo "Agent process not found"
                    fi
                    rm -f agent.pid
                else
                    echo "No agent.pid file found"
                fi
                """.formatted(targetDir);
    }

    // ========== DOCKER SCRIPT GENERATION ==========

    private String generateDockerEnvFile(JobServerVO server) {
        return """
                # Agent environment variables
                AGENT_NAME=%s
                SCHEDULER_API_URL=%s
                REDIS_HOST=%s
                REDIS_PORT=%d
                AGENT_PORT=%d
                AGENT_QUEUE_NAME=%s
                AGENT_SERVER_ID=%s
                """.formatted(
                server.getSystemName(),
                schedulerExternalUrl,
                agentRedisHost,
                agentRedisPort,
                server.getAgentPort() != null ? server.getAgentPort() : 8081,
                server.getQueueName(),
                server.getSystemId()
        );
    }

    private String generateDockerComposeFile(JobServerVO server) {
        String containerName = "batch-agent-" + server.getSystemName().toLowerCase().replaceAll("[^a-z0-9-]", "-");
        String folderPath = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";

        // Build volume mounts with proper YAML indentation (6 spaces for array items under volumes)
        StringBuilder volumeMounts = new StringBuilder();
        volumeMounts.append("      - ").append(folderPath).append("/logs:/app/logs\n");

        // Add custom mount paths if provided, otherwise mount folderPath
        if (server.getMountPaths() != null && !server.getMountPaths().trim().isEmpty()) {
            // User specified custom mount paths
            String[] paths = server.getMountPaths().split(",");
            for (String path : paths) {
                String trimmedPath = path.trim();
                if (!trimmedPath.isEmpty()) {
                    // Mount path to same path inside container for easy script execution
                    volumeMounts.append("      - ").append(trimmedPath).append(":").append(trimmedPath).append("\n");
                }
            }
        } else {
            // Default: mount folderPath for script access
            volumeMounts.append("      - ").append(folderPath).append(":").append(folderPath).append("\n");
        }

        return """
version: '3.8'

services:
  agent:
    image: %s
    container_name: %s
    restart: unless-stopped
    environment:
      - SPRING_DATA_REDIS_HOST=${REDIS_HOST}
      - SPRING_DATA_REDIS_PORT=${REDIS_PORT}
      - AGENT_QUEUE_NAME=${AGENT_QUEUE_NAME}
      - AGENT_SERVER_ID=${AGENT_SERVER_ID}
      - SCHEDULER_API_URL=${SCHEDULER_API_URL}
      - SERVER_PORT=${AGENT_PORT}
      - LOG_PATH=/app/logs
    ports:
      - "${AGENT_PORT}:${AGENT_PORT}"
    volumes:
%s    networks:
      - batch-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${AGENT_PORT}/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  batch-network:
    driver: bridge
""".formatted(dockerImageName, containerName, volumeMounts.toString());
    }

    private String generateDockerStartScript(String targetDir) {
        return """
                #!/bin/bash
                cd %s

                # Create logs directory if not exists
                mkdir -p %s/logs

                echo "Starting agent container..."
                docker compose up -d

                echo "Waiting for agent to be healthy..."
                sleep 5

                docker compose ps
                echo "Agent started successfully"
                """.formatted(targetDir, targetDir);
    }

    private String generateDockerStopScript(String targetDir) {
        return """
                #!/bin/bash
                cd %s

                echo "Stopping agent container..."
                docker compose down

                echo "Agent stopped successfully"
                """.formatted(targetDir);
    }
}
