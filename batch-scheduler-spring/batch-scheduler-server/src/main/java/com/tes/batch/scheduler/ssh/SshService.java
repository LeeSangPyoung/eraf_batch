package com.tes.batch.scheduler.ssh;

import com.jcraft.jsch.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class SshService {

    @Value("${ssh.keys-path:./keys}")
    private String sshKeysPath;

    @Value("${ssh.default-username:tangosvc}")
    private String defaultUsername;

    @Value("${app.agent.jar-path:./batch-scheduler-agent.jar}")
    private String agentJarPath;

    @Value("${spring.data.redis.host:192.168.254.102}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${app.scheduler.api-url:http://localhost:8080}")
    private String schedulerUrl;

    /**
     * Parse host IP address to extract username if format is user@host
     */
    public String[] parseUserHost(String hostIpAddr, String sshUser) {
        if (hostIpAddr != null && hostIpAddr.contains("@")) {
            String[] parts = hostIpAddr.split("@", 2);
            return new String[]{parts[0], parts[1]};
        }
        return new String[]{sshUser != null ? sshUser : defaultUsername, hostIpAddr};
    }

    /**
     * Create SSH session
     */
    public Session createSession(String host, String username) throws JSchException {
        JSch jsch = new JSch();

        // Try to load private key
        String keyPath = sshKeysPath + "/" + username + "/id_rsa";
        File keyFile = new File(keyPath);
        log.info("Looking for SSH key at: {} (absolute: {})", keyPath, keyFile.getAbsolutePath());
        if (keyFile.exists()) {
            jsch.addIdentity(keyPath);
            log.info("Using SSH key: {}", keyFile.getAbsolutePath());
        } else {
            log.warn("SSH key not found: {}", keyFile.getAbsolutePath());
            // Try default key location
            String defaultKey = System.getProperty("user.home") + "/.ssh/id_rsa";
            File defaultKeyFile = new File(defaultKey);
            if (defaultKeyFile.exists()) {
                jsch.addIdentity(defaultKey);
                log.info("Using default SSH key: {}", defaultKey);
            } else {
                log.error("No SSH key found! Tried: {} and {}", keyFile.getAbsolutePath(), defaultKey);
            }
        }

        Session session = jsch.getSession(username, host, 22);
        session.setConfig("StrictHostKeyChecking", "no");
        session.setConfig("PreferredAuthentications", "publickey,keyboard-interactive,password");
        session.setTimeout(30000);

        return session;
    }

    /**
     * Execute command via SSH
     */
    public SshResult executeCommand(Session session, String command) {
        ChannelExec channel = null;
        try {
            channel = (ChannelExec) session.openChannel("exec");
            channel.setCommand(command);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ByteArrayOutputStream errorStream = new ByteArrayOutputStream();
            channel.setOutputStream(outputStream);
            channel.setErrStream(errorStream);

            channel.connect(30000);

            // Wait for command completion
            while (!channel.isClosed()) {
                Thread.sleep(100);
            }

            int exitCode = channel.getExitStatus();
            String output = outputStream.toString("UTF-8");
            String error = errorStream.toString("UTF-8");

            log.debug("Command: {}", command);
            log.debug("Exit code: {}", exitCode);
            if (!output.isEmpty()) log.debug("Output: {}", output);
            if (!error.isEmpty()) log.debug("Error: {}", error);

            return new SshResult(exitCode == 0, output, error, exitCode);

        } catch (Exception e) {
            log.error("SSH command execution failed: {}", e.getMessage());
            return new SshResult(false, "", e.getMessage(), -1);
        } finally {
            if (channel != null) {
                channel.disconnect();
            }
        }
    }

    /**
     * Copy file via SCP
     */
    public void scpUpload(Session session, String localPath, String remotePath) throws Exception {
        ChannelSftp sftpChannel = null;
        try {
            sftpChannel = (ChannelSftp) session.openChannel("sftp");
            sftpChannel.connect(30000);

            // Create remote directory if not exists
            String remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
            try {
                sftpChannel.stat(remoteDir);
            } catch (SftpException e) {
                mkdirRecursive(sftpChannel, remoteDir);
            }

            // Upload file
            try (InputStream is = new FileInputStream(localPath)) {
                sftpChannel.put(is, remotePath);
                log.info("Uploaded {} to {}", localPath, remotePath);
            }

        } finally {
            if (sftpChannel != null) {
                sftpChannel.disconnect();
            }
        }
    }

    /**
     * Create directory recursively via SFTP
     */
    private void mkdirRecursive(ChannelSftp sftpChannel, String path) throws SftpException {
        String[] folders = path.split("/");
        StringBuilder currentPath = new StringBuilder();

        for (String folder : folders) {
            if (folder.isEmpty()) continue;
            currentPath.append("/").append(folder);
            try {
                sftpChannel.stat(currentPath.toString());
            } catch (SftpException e) {
                sftpChannel.mkdir(currentPath.toString());
                log.debug("Created directory: {}", currentPath);
            }
        }
    }

    /**
     * Deploy Java Agent to remote server
     */
    public void deployWorker(String hostIpAddr, String sshUser, String folderPath, String queueName, Integer agentPort) throws Exception {
        if (agentPort == null || agentPort < 1024) {
            agentPort = 8081 + (Math.abs(queueName.hashCode()) % 919);
        }
        String[] userHost = parseUserHost(hostIpAddr, sshUser);
        String username = userHost[0];
        String host = userHost[1];

        log.info("========== Starting Agent Deployment ==========");
        log.info("Target: {}@{}:{}", username, host, folderPath);
        log.info("Queue Name: {}", queueName);

        Session session = createSession(host, username);
        try {
            log.info("Connecting to SSH...");
            session.connect();
            log.info("SSH connected successfully");

            // 1. Create agent folder
            log.info("Step 1: Creating directory {}", folderPath);
            String mkdirCmd = String.format("mkdir -p %s", folderPath);
            SshResult mkdirResult = executeCommand(session, mkdirCmd);
            if (!mkdirResult.success()) {
                throw new RuntimeException("Failed to create directory: " + mkdirResult.error());
            }
            log.info("Directory created");

            // 2. Upload batch-scheduler-agent.jar
            log.info("Step 2: Uploading agent JAR");
            File jarFile = new File(agentJarPath);
            log.info("Agent JAR path: {} (absolute: {}, exists: {})", agentJarPath, jarFile.getAbsolutePath(), jarFile.exists());
            if (!jarFile.exists()) {
                throw new RuntimeException("Agent JAR not found: " + jarFile.getAbsolutePath());
            }
            scpUpload(session, agentJarPath, folderPath + "/batch-scheduler-agent.jar");
            log.info("Agent JAR uploaded");

            // 3. Generate and upload application.yml
            log.info("Step 3: Uploading application.yml");
            String agentConfig = generateAgentConfig(queueName, host, folderPath, agentPort);
            scpUploadContent(session, agentConfig, folderPath + "/application.yml");
            log.info("application.yml uploaded");

            // 4. Generate and upload start script
            log.info("Step 4: Uploading start-agent.sh");
            String startScript = generateStartScript(folderPath);
            scpUploadContent(session, startScript, folderPath + "/start-agent.sh");
            executeCommand(session, "chmod +x " + folderPath + "/start-agent.sh");
            log.info("start-agent.sh uploaded");

            // 5. Generate and upload stop script
            log.info("Step 5: Uploading stop-agent.sh");
            String stopScript = generateStopScript(folderPath);
            scpUploadContent(session, stopScript, folderPath + "/stop-agent.sh");
            executeCommand(session, "chmod +x " + folderPath + "/stop-agent.sh");
            log.info("stop-agent.sh uploaded");

            // 6. Start agent
            log.info("Step 6: Starting agent");
            SshResult startResult = executeCommand(session, folderPath + "/start-agent.sh");
            log.info("Start result - success: {}, output: {}, error: {}", startResult.success(), startResult.output(), startResult.error());

            log.info("========== Agent Deployment Completed ==========");

        } finally {
            session.disconnect();
        }
    }

    /**
     * Generate application.yml for agent
     */
    private String generateAgentConfig(String queueName, String serverId, String folderPath, int port) {
        return String.format("""
                server:
                  port: %d

                spring:
                  application:
                    name: batch-scheduler-agent
                  data:
                    redis:
                      host: %s
                      port: %d
                      timeout: 5000ms

                agent:
                  queue-name: %s
                  server-id: %s
                  heartbeat:
                    interval: 10000
                    timeout: 60000

                scheduler:
                  api-url: %s

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
                    name: %s/logs/agent.log
                  logback:
                    rollingpolicy:
                      max-file-size: 100MB
                      max-history: 30
                      file-name-pattern: %s/logs/backup/agent.%%d{yyyy-MM-dd}.%%i.log
                """, port, redisHost, redisPort, queueName, serverId, schedulerUrl, folderPath, folderPath);
    }

    /**
     * Generate start script for agent
     */
    private String generateStartScript(String folderPath) {
        return String.format("""
                #!/bin/bash
                cd %s

                # Load Java environment
                if [ -f /etc/profile.d/java.sh ]; then
                    source /etc/profile.d/java.sh
                fi

                # Create log and backup directories in agent folder
                mkdir -p %s/logs
                mkdir -p %s/logs/backup

                # Stop existing process if running
                if [ -f agent.pid ]; then
                    PID=$(cat agent.pid)
                    if ps -p $PID > /dev/null 2>&1; then
                        kill $PID
                        sleep 2
                    fi
                    rm -f agent.pid
                fi

                # Start agent
                nohup java -jar batch-scheduler-agent.jar --spring.config.location=application.yml > %s/logs/agent.log 2>&1 &
                echo $! > agent.pid
                echo "Agent started with PID: $(cat agent.pid)"
                """, folderPath, folderPath, folderPath, folderPath);
    }

    /**
     * Generate stop script for agent
     */
    private String generateStopScript(String folderPath) {
        return String.format("""
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
                """, folderPath);
    }

    /**
     * Upload content as a file via SFTP
     */
    public void scpUploadContent(Session session, String content, String remotePath) throws Exception {
        ChannelSftp sftpChannel = null;
        try {
            sftpChannel = (ChannelSftp) session.openChannel("sftp");
            sftpChannel.connect(30000);

            // Create remote directory if not exists
            String remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
            try {
                sftpChannel.stat(remoteDir);
            } catch (SftpException e) {
                mkdirRecursive(sftpChannel, remoteDir);
            }

            // Upload content
            try (InputStream is = new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8))) {
                sftpChannel.put(is, remotePath);
                log.info("Uploaded content to {}", remotePath);
            }

        } finally {
            if (sftpChannel != null) {
                sftpChannel.disconnect();
            }
        }
    }

    /**
     * Stop agent on remote server
     */
    public void stopWorker(String hostIpAddr, String sshUser, String folderPath) throws Exception {
        String[] userHost = parseUserHost(hostIpAddr, sshUser);
        String username = userHost[0];
        String host = userHost[1];

        log.info("Stopping agent at {}@{}:{}", username, host, folderPath);

        Session session = createSession(host, username);
        try {
            session.connect();

            String stopScript = folderPath + "/stop-agent.sh";
            SshResult result = executeCommand(session, stopScript);
            log.info("Agent stop result: {}", result.success() ? "success" : result.error());

        } finally {
            session.disconnect();
        }
    }

    /**
     * Start agent on remote server
     */
    public void startWorker(String hostIpAddr, String sshUser, String folderPath) throws Exception {
        String[] userHost = parseUserHost(hostIpAddr, sshUser);
        String username = userHost[0];
        String host = userHost[1];

        log.info("Starting agent at {}@{}:{}", username, host, folderPath);

        Session session = createSession(host, username);
        try {
            session.connect();

            String startScript = folderPath + "/start-agent.sh";
            SshResult result = executeCommand(session, startScript);
            if (!result.success()) {
                log.warn("Agent start returned non-zero: {}", result.error());
            }

        } finally {
            session.disconnect();
        }
    }

    /**
     * Restart agent on remote server (alias for startWorker)
     */
    public void restartWorker(String hostIpAddr, String sshUser, String folderPath) throws Exception {
        startWorker(hostIpAddr, sshUser, folderPath);
    }

    /**
     * Sync config and restart agent (lightweight operation for heartbeat recovery)
     */
    public void syncConfigAndRestart(String hostIpAddr, String sshUser, String folderPath, String queueName, Integer agentPort) throws Exception {
        String[] userHost = parseUserHost(hostIpAddr, sshUser);
        String username = userHost[0];
        String host = userHost[1];

        if (agentPort == null || agentPort < 1024) {
            agentPort = 8081 + (Math.abs(queueName.hashCode()) % 919);
        }

        log.info("Syncing config and restarting agent at {}@{}:{} (port: {})", username, host, folderPath, agentPort);

        Session session = createSession(host, username);
        try {
            session.connect();

            // 1. Upload application.yml with correct queueName and port
            String agentConfig = generateAgentConfig(queueName, host, folderPath, agentPort);
            scpUploadContent(session, agentConfig, folderPath + "/application.yml");
            log.info("Config synced for queue: {}", queueName);

            // 2. Restart agent
            String startScript = folderPath + "/start-agent.sh";
            SshResult result = executeCommand(session, startScript);
            log.info("Agent restart result: {}", result.success() ? "success" : result.error());

        } finally {
            session.disconnect();
        }
    }

    /**
     * Clean agent folder on remote server
     */
    public void cleanWorkerFolder(String hostIpAddr, String sshUser, String folderPath) throws Exception {
        String[] userHost = parseUserHost(hostIpAddr, sshUser);
        String username = userHost[0];
        String host = userHost[1];

        log.info("Cleaning agent folder at {}@{}:{}", username, host, folderPath);

        Session session = createSession(host, username);
        try {
            session.connect();

            String cleanCmd = String.format("rm -rf %s", folderPath);
            executeCommand(session, cleanCmd);

        } finally {
            session.disconnect();
        }
    }

    /**
     * SSH execution result
     */
    public static class SshResult {
        private final boolean success;
        private final String output;
        private final String error;
        private final int exitCode;

        public SshResult(boolean success, String output, String error, int exitCode) {
            this.success = success;
            this.output = output;
            this.error = error;
            this.exitCode = exitCode;
        }

        public boolean success() { return success; }
        public String output() { return output; }
        public String error() { return error; }
        public int exitCode() { return exitCode; }
    }
}
