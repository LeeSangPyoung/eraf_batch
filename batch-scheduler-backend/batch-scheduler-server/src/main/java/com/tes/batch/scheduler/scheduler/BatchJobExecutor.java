package com.tes.batch.scheduler.scheduler;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.enums.JobType;
import com.tes.batch.scheduler.domain.group.mapper.JobGroupMapper;
import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.domain.user.mapper.UserMapper;
import com.tes.batch.scheduler.domain.user.vo.UserVO;
import com.tes.batch.scheduler.message.RedisMessagePublisher;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Quartz Job executor that triggers batch job execution
 */
@Slf4j
@Component
public class BatchJobExecutor implements Job {

    @Autowired
    private JobMapper jobMapper;

    @Autowired
    private JobRunLogMapper jobRunLogMapper;

    @Autowired
    private JobGroupMapper groupMapper;

    @Autowired
    private JobServerMapper serverMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private SchedulerService schedulerService;

    @Autowired
    private RedisMessagePublisher redisMessagePublisher;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        String jobId = context.getJobDetail().getJobDataMap().getString("jobId");
        log.info("Executing scheduled job: {}", jobId);

        try {
            JobVO job = jobMapper.findById(jobId);
            if (job == null) {
                log.warn("Job not found: {}", jobId);
                return;
            }

            if (!job.getIsEnabled()) {
                log.info("Job is disabled, skipping: {}", jobId);
                return;
            }

            // Skip jobs that belong to a workflow - they are executed via workflow scheduler
            if (job.getWorkflowId() != null && !job.getWorkflowId().isEmpty()) {
                log.info("Job {} belongs to workflow, skipping individual execution", jobId);
                return;
            }

            // Get available server with failover support (primary -> secondary -> tertiary)
            JobServerVO server = getAvailableServer(job);

            if (server == null) {
                log.warn("No healthy server available for job: {} (tried primary, secondary, tertiary)", jobId);
                jobMapper.updateState(jobId, "BROKEN", null);
                return;
            }

            String queueName = server.getQueueName();
            if (queueName == null || queueName.isEmpty()) {
                log.warn("No queue configured for server: {}", server.getSystemId());
                return;
            }

            // Log which server was selected
            String serverRole = determineServerRole(job, server.getSystemId());
            log.info("Selected {} server for job {}: {} ({})",
                    serverRole, jobId, server.getSystemName(), server.getSystemId());

            // Get group info for denormalization
            JobGroupVO group = null;
            if (job.getGroupId() != null) {
                group = groupMapper.findById(job.getGroupId());
            }

            // Get job creator's user ID for logging
            String creatorUserId = null;
            if (job.getFrstRegUserId() != null) {
                UserVO creator = userMapper.findById(job.getFrstRegUserId());
                if (creator != null) {
                    creatorUserId = creator.getUserId();
                }
            }

            // Create run log (matching actual DB schema)
            // Note: Log the actual server used (may differ from job's primary if failover occurred)
            long now = System.currentTimeMillis();
            String taskId = UUID.randomUUID().toString();
            JobRunLogVO runLog = JobRunLogVO.builder()
                    .jobId(jobId)
                    .jobName(job.getJobName())
                    .systemId(server.getSystemId())  // Use actual server used (may be failover)
                    .systemName(server.getSystemName())
                    .groupId(job.getGroupId())
                    .groupName(group != null ? group.getGroupName() : null)
                    .celeryTaskName(taskId)  // maps to task_id
                    .batchType("Auto")       // scheduled execution
                    .operation("RUN")        // job is running
                    .status("PENDING")
                    .reqStartDate(now)       // maps to scheduled_time
                    .actualStartDate(now)    // maps to start_time
                    .retryCount(0)           // maps to retry_attempt
                    .userName(creatorUserId) // job creator
                    .build();

            jobRunLogMapper.insert(runLog);

            // Update job state to RUNNING and set last_start_date at Scheduler trigger time
            jobMapper.updateStateWithLastStart(jobId, "RUNNING", null, now);

            // Build and send job message to Agent via Redis
            JobMessage message = JobMessage.builder()
                    .jobId(jobId)
                    .taskId(String.valueOf(runLog.getLogId()))
                    .jobName(job.getJobName())
                    .jobType(JobType.valueOf(job.getJobType()))
                    .jobAction(job.getJobAction())
                    .jobBody(job.getJobBody())
                    .maxDurationSeconds(parseMaxDuration(job.getMaxRunDuration()))
                    .retryCount(job.getMaxFailure() != null ? job.getMaxFailure() : 0)
                    .retryDelay(job.getRetryDelay() != null ? job.getRetryDelay() : 0)
                    .priority(job.getPriority() != null ? job.getPriority() : 3)
                    .queueName(queueName)
                    .scheduledTime(now)
                    .manuallyRun(false)
                    .build();

            redisMessagePublisher.publishJob(queueName, message);

            // NOTE: Do NOT reschedule here - state must stay RUNNING until job completes
            // Rescheduling happens in JobResultListener when result is received from agent

            log.info("Job sent to agent: {} (logId: {}, queue: {}), state=RUNNING", jobId, runLog.getLogId(), queueName);

        } catch (Exception e) {
            log.error("Error executing job: {}", jobId, e);
            throw new JobExecutionException(e);
        }
    }

    /**
     * Get available server with failover support.
     * Tries primary -> secondary -> tertiary in order.
     * Returns first server that is ONLINE and healthy.
     */
    private JobServerVO getAvailableServer(JobVO job) {
        // Try primary server
        if (job.getSystemId() != null) {
            JobServerVO primary = serverMapper.findById(job.getSystemId());
            if (isServerAvailable(primary)) {
                return primary;
            }
            log.info("Primary server {} is unavailable for job {}", job.getSystemId(), job.getJobId());
        }

        // Try secondary server
        if (job.getSecondarySystemId() != null) {
            JobServerVO secondary = serverMapper.findById(job.getSecondarySystemId());
            if (isServerAvailable(secondary)) {
                log.info("Failover to secondary server {} for job {}", job.getSecondarySystemId(), job.getJobId());
                return secondary;
            }
            log.info("Secondary server {} is unavailable for job {}", job.getSecondarySystemId(), job.getJobId());
        }

        // Try tertiary server
        if (job.getTertiarySystemId() != null) {
            JobServerVO tertiary = serverMapper.findById(job.getTertiarySystemId());
            if (isServerAvailable(tertiary)) {
                log.info("Failover to tertiary server {} for job {}", job.getTertiarySystemId(), job.getJobId());
                return tertiary;
            }
            log.info("Tertiary server {} is unavailable for job {}", job.getTertiarySystemId(), job.getJobId());
        }

        return null;
    }

    /**
     * Check if server is available (ONLINE and healthy)
     */
    private boolean isServerAvailable(JobServerVO server) {
        if (server == null) {
            return false;
        }
        boolean isOnline = "ONLINE".equals(server.getAgentStatus());
        boolean isHealthy = Boolean.TRUE.equals(server.getIsHealthy());
        return isOnline && isHealthy;
    }

    /**
     * Determine the role of the selected server (primary, secondary, or tertiary)
     */
    private String determineServerRole(JobVO job, String selectedSystemId) {
        if (selectedSystemId.equals(job.getSystemId())) {
            return "primary";
        } else if (selectedSystemId.equals(job.getSecondarySystemId())) {
            return "secondary";
        } else if (selectedSystemId.equals(job.getTertiarySystemId())) {
            return "tertiary";
        }
        return "unknown";
    }

    /**
     * Parse maxRunDuration string to seconds.
     * Formats: "3600" (seconds), "01:00:00" (HH:mm:ss), "PT1H" (ISO-8601)
     */
    private Long parseMaxDuration(String maxRunDuration) {
        if (maxRunDuration == null || maxRunDuration.isEmpty()) {
            return 3600L; // Default 1 hour
        }
        try {
            // Try parsing as plain seconds
            return Long.parseLong(maxRunDuration);
        } catch (NumberFormatException e) {
            try {
                // Try parsing as HH:mm:ss
                String[] parts = maxRunDuration.split(":");
                if (parts.length == 3) {
                    long hours = Long.parseLong(parts[0]);
                    long minutes = Long.parseLong(parts[1]);
                    long seconds = Long.parseLong(parts[2]);
                    return hours * 3600 + minutes * 60 + seconds;
                }
            } catch (Exception ex) {
                log.warn("Failed to parse maxRunDuration: {}", maxRunDuration);
            }
        }
        return 3600L; // Default 1 hour
    }
}
