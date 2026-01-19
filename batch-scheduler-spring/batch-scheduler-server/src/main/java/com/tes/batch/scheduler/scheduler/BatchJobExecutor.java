package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.group.mapper.JobGroupMapper;
import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
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

            // Get group and server names
            String groupName = null;
            String systemName = null;
            if (job.getGroupId() != null) {
                JobGroupVO group = groupMapper.findById(job.getGroupId());
                if (group != null) groupName = group.getGroupName();
            }
            if (job.getSystemId() != null) {
                JobServerVO server = serverMapper.findById(job.getSystemId());
                if (server != null) systemName = server.getSystemName();
            }

            // Create run log
            long now = System.currentTimeMillis();
            JobRunLogVO runLog = JobRunLogVO.builder()
                    .jobId(jobId)
                    .groupId(job.getGroupId())
                    .systemId(job.getSystemId())
                    .celeryTaskName(UUID.randomUUID().toString())
                    .jobName(job.getJobName())
                    .groupName(groupName)
                    .systemName(systemName)
                    .operation("RUN")
                    .batchType("Auto")
                    .status("PENDING")
                    .reqStartDate(now)
                    .retryCount(0)
                    .build();

            jobRunLogMapper.insert(runLog);

            // Update job state
            jobMapper.updateState(jobId, "RUNNING", null);

            // Calculate next run date and update
            Long nextRunDate = schedulerService.calculateNextRunDate(job);
            if (nextRunDate != null) {
                jobMapper.updateState(jobId, "RUNNING", nextRunDate);
                schedulerService.scheduleJob(job, nextRunDate);
            }

            // TODO: Send job to Agent via Redis
            // This will be implemented in Phase 8

            log.info("Job scheduled for execution: {} (logId: {})", jobId, runLog.getLogId());

        } catch (Exception e) {
            log.error("Error executing job: {}", jobId, e);
            throw new JobExecutionException(e);
        }
    }
}
