package com.tes.batch.scheduler.agent;

import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Periodically checks Agent health status via Redis heartbeats
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentHealthChecker {

    private final JobServerMapper serverMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final long HEARTBEAT_TIMEOUT = 60000; // 60 seconds

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

                String healthKey = "agent:health:" + queueName;
                Object lastHeartbeatObj = redisTemplate.opsForValue().get(healthKey);

                String newStatus;
                if (lastHeartbeatObj == null) {
                    newStatus = "OFFLINE";
                } else {
                    long lastHeartbeat = ((Number) lastHeartbeatObj).longValue();
                    long now = System.currentTimeMillis();

                    if ((now - lastHeartbeat) < HEARTBEAT_TIMEOUT) {
                        newStatus = "ONLINE";
                    } else {
                        newStatus = "OFFLINE";
                    }
                }

                // Update if status changed
                if (!newStatus.equals(server.getAgentStatus())) {
                    serverMapper.updateAgentStatus(server.getSystemId(), newStatus);
                    log.info("Agent status changed: {} -> {} ({})",
                            server.getAgentStatus(), newStatus, server.getSystemName());
                }

            } catch (Exception e) {
                log.error("Failed to check agent health for server: {}", server.getSystemId(), e);
            }
        }
    }
}
