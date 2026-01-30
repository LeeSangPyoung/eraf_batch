package com.tes.batch.scheduler.agent;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.ssh.SshService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Periodically checks Agent health status via Redis heartbeats.
 *
 * agent_status = user-controlled (Start/Stop actions)
 * is_healthy = actual heartbeat check result
 *
 * If agent_status=ONLINE but is_healthy=false, auto-sync config and restart.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentHealthChecker {

    private final JobServerMapper serverMapper;
    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SshService sshService;

    private static final long SYNC_COOLDOWN = 10000; // 10 seconds cooldown between sync attempts

    // Track last sync attempt time per server
    private final java.util.Map<String, Long> lastSyncAttempt = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Check agent health every 30 seconds
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void checkAgentHealth() {
        List<JobServerVO> servers = serverMapper.findAll();

        for (JobServerVO server : servers) {
            try {
                String queueName = server.getQueueName();
                if (queueName == null || queueName.isEmpty()) {
                    continue;
                }

                // Skip health check if user set to OFFLINE - no need to check
                if ("OFFLINE".equals(server.getAgentStatus())) {
                    // Ensure is_healthy is null/false for OFFLINE servers
                    if (Boolean.TRUE.equals(server.getIsHealthy())) {
                        serverMapper.updateHealthStatus(server.getSystemId(), null);
                    }
                    continue;
                }

                String healthKey = "agent:health:" + queueName;

                // Use Redis key existence check instead of timestamp comparison
                // This avoids issues with clock drift between servers
                boolean isHealthy = Boolean.TRUE.equals(redisTemplate.hasKey(healthKey));

                Boolean currentHealthy = server.getIsHealthy();
                if (currentHealthy == null) currentHealthy = false;

                // Update is_healthy if changed
                if (isHealthy != currentHealthy) {
                    serverMapper.updateHealthStatus(server.getSystemId(), isHealthy);
                    log.info("Agent health changed: {} -> {} ({})",
                            currentHealthy ? "healthy" : "unhealthy",
                            isHealthy ? "healthy" : "unhealthy",
                            server.getSystemName());

                    // If became unhealthy, mark RUNNING jobs as BROKEN and reset job state
                    if (!isHealthy && currentHealthy) {
                        // 1. Mark job run logs as BROKEN
                        int brokenCount = jobRunLogMapper.markRunningJobsAsBrokenBySystemId(
                                server.getSystemId(),
                                System.currentTimeMillis(),
                                "Agent heartbeat lost"
                        );
                        if (brokenCount > 0) {
                            log.warn("Marked {} running job log(s) as BROKEN due to agent unhealthy: {}",
                                    brokenCount, server.getSystemName());
                        }

                        // 2. Reset job current_state to SCHEDULED
                        int resetCount = jobMapper.resetStuckJobsBySystemId(server.getSystemId());
                        if (resetCount > 0) {
                            log.warn("Reset {} stuck job(s) to SCHEDULED due to agent unhealthy: {}",
                                    resetCount, server.getSystemName());
                        }
                    }
                }

                // Auto-sync: If user set ONLINE but agent is not healthy, resync config
                if (!isHealthy) {
                    log.info("Agent {} is expected ONLINE but unhealthy, triggering config sync...",
                            server.getSystemName());
                    triggerConfigSync(server);
                }

            } catch (Exception e) {
                log.error("Failed to check agent health for server: {}", server.getSystemId(), e);
            }
        }
    }

    /**
     * Sync config and restart agent when status mismatch detected
     * Applies cooldown to prevent repeated sync attempts
     */
    private void triggerConfigSync(JobServerVO server) {
        String serverId = server.getSystemId();
        long now = System.currentTimeMillis();

        // Check cooldown - skip if synced recently
        Long lastAttempt = lastSyncAttempt.get(serverId);
        if (lastAttempt != null && (now - lastAttempt) < SYNC_COOLDOWN) {
            long remainingSeconds = (SYNC_COOLDOWN - (now - lastAttempt)) / 1000;
            log.debug("Skipping config sync for {} - cooldown active ({} seconds remaining)",
                    server.getSystemName(), remainingSeconds);
            return;
        }

        try {
            if (server.getHostIpAddr() != null && server.getFolderPath() != null) {
                // Record sync attempt time before trying
                lastSyncAttempt.put(serverId, now);

                // Upload config only (not full JAR) and restart
                sshService.syncConfigAndRestart(
                        server.getHostIpAddr(),
                        server.getSshUser(),
                        server.getFolderPath(),
                        server.getQueueName(),
                        server.getAgentPort()
                );
                log.info("Config sync triggered for: {} (next sync allowed in {} seconds)",
                        server.getSystemName(), SYNC_COOLDOWN / 1000);
            }
        } catch (Exception e) {
            log.error("Failed to sync config for {}: {}", server.getSystemName(), e.getMessage());
            // Remove from cooldown map on failure so it can retry sooner
            lastSyncAttempt.remove(serverId);
        }
    }
}
