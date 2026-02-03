package com.tes.batch.scheduler.agent;

import com.jcraft.jsch.*;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.Properties;

/**
 * Deploys Agent to remote servers via SSH/SCP
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentDeployer {

    @Value("${app.agent.jar-path:./batch-scheduler-agent.jar}")
    private String agentJarPath;

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${app.scheduler.api-url:http://localhost:8080}")
    private String schedulerUrl;

    private static final int SSH_PORT = 22;
    private static final int TIMEOUT = 30000;

    /**
     * Deploy agent to server
     */
    public void deployAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Deploying agent to server: {} ({})", server.getSystemName(), server.getHostIpAddr());

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

            // Upload agent JAR
            String agentJarName = "batch-scheduler-agent.jar";
            uploadFile(session, agentJarPath, targetDir + "/" + agentJarName);

            // Generate and upload configuration
            String config = generateAgentConfig(server);
            uploadContent(session, config, targetDir + "/application.yml");

            // Generate and upload start script
            String startScript = generateStartScript(targetDir, agentJarName);
            uploadContent(session, startScript, targetDir + "/start-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/start-agent.sh");

            // Generate and upload stop script
            String stopScript = generateStopScript(targetDir);
            uploadContent(session, stopScript, targetDir + "/stop-agent.sh");
            executeCommand(session, "chmod +x " + targetDir + "/stop-agent.sh");

            log.info("Agent deployed successfully to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Start agent on remote server
     */
    public void startAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Starting agent on server: {}", server.getSystemName());

        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/start-agent.sh");

            log.info("Agent start command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    /**
     * Stop agent on remote server
     */
    public void stopAgent(JobServerVO server, String privateKeyPath) throws Exception {
        log.info("Stopping agent on server: {}", server.getSystemName());

        Session session = null;
        try {
            session = createSession(server, privateKeyPath);
            session.connect(TIMEOUT);

            String targetDir = server.getFolderPath() != null ? server.getFolderPath() : "/opt/batch-agent";
            executeCommand(session, targetDir + "/stop-agent.sh");

            log.info("Agent stop command sent to: {}", server.getSystemName());

        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    private Session createSession(JobServerVO server, String privateKeyPath) throws JSchException {
        JSch jsch = new JSch();

        if (privateKeyPath != null && !privateKeyPath.isEmpty()) {
            jsch.addIdentity(privateKeyPath);
        }

        String user = server.getSshUser() != null ? server.getSshUser() : "root";
        Session session = jsch.getSession(user, server.getHostIpAddr(), SSH_PORT);

        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");
        session.setConfig(config);

        return session;
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
                  port: 8081

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
                """.formatted(
                redisHost,
                redisPort,
                server.getQueueName(),
                server.getSystemId(),
                schedulerUrl
        );
    }

    private String generateStartScript(String targetDir, String jarName) {
        return """
                #!/bin/bash
                cd %s

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
                nohup java -jar %s --spring.config.location=application.yml > agent.log 2>&1 &
                echo $! > agent.pid
                echo "Agent started with PID: $(cat agent.pid)"
                """.formatted(targetDir, jarName);
    }

    private String generateStopScript(String targetDir) {
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
}
