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

            // Get server for queue name
            JobServerVO server = null;
            String queueName = null;
            if (job.getSystemId() != null) {
                server = serverMapper.findById(job.getSystemId());
                if (server != null) {
                    queueName = server.getQueueName();
                }
            }

            if (queueName == null || queueName.isEmpty()) {
                log.warn("No queue configured for job's server: {}", jobId);
                return;
            }

            // Get group info for denormalization
            JobGroupVO group = null;
            if (job.getGroupId() != null) {
                group = groupMapper.findById(job.getGroupId());
            }

            // Create run log (matching actual DB schema)
            long now = System.currentTimeMillis();
            String taskId = UUID.randomUUID().toString();
            JobRunLogVO runLog = JobRunLogVO.builder()
                    .jobId(jobId)
                    .jobName(job.getJobName())
                    .systemId(job.getSystemId())
                    .systemName(server != null ? server.getSystemName() : null)
                    .groupId(job.getGroupId())
                    .groupName(group != null ? group.getGroupName() : null)
                    .celeryTaskName(taskId)  // maps to task_id
                    .batchType("Auto")       // scheduled execution
                    .operation("RUN")        // job is running
                    .status("PENDING")
                    .reqStartDate(now)       // maps to scheduled_time
                    .actualStartDate(now)    // maps to start_time
                    .retryCount(0)           // maps to retry_attempt
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

            // Reschedule for next run using Quartz native scheduling
            schedulerService.rescheduleJobAfterExecution(job);

            log.info("Job sent to agent: {} (logId: {}, queue: {})", jobId, runLog.getLogId(), queueName);

        } catch (Exception e) {
            log.error("Error executing job: {}", jobId, e);
            throw new JobExecutionException(e);
        }
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
