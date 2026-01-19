package com.tes.batch.scheduler.domain.job.service;

import com.tes.batch.scheduler.domain.group.mapper.JobGroupMapper;
import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import com.tes.batch.scheduler.domain.job.dto.JobFilterRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRequest;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final JobGroupMapper groupMapper;
    private final JobServerMapper serverMapper;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<JobVO> getJobs(JobFilterRequest request) {
        int offset = request.getPage() * request.getSize();

        if (securityUtils.isAdmin()) {
            return jobMapper.findByFilters(
                    request.getJobId(),
                    request.getGroupId(),
                    request.getSystemId(),
                    request.getIsEnabled(),
                    request.getCurrentState(),
                    request.getTextSearch(),
                    request.getWfRegistered(),
                    request.getLastStartDateFrom(),
                    request.getLastStartDateTo(),
                    request.getSize(),
                    offset
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return List.of();
            }
            return jobMapper.findByFiltersAndGroupIds(
                    groupIds,
                    request.getJobId(),
                    request.getSystemId(),
                    request.getIsEnabled(),
                    request.getCurrentState(),
                    request.getTextSearch(),
                    request.getSize(),
                    offset
            );
        }
    }

    @Transactional(readOnly = true)
    public long countJobs(JobFilterRequest request) {
        if (securityUtils.isAdmin()) {
            return jobMapper.countByFilters(
                    request.getJobId(),
                    request.getGroupId(),
                    request.getSystemId(),
                    request.getIsEnabled(),
                    request.getCurrentState(),
                    request.getTextSearch(),
                    request.getWfRegistered(),
                    request.getLastStartDateFrom(),
                    request.getLastStartDateTo()
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return 0;
            }
            return jobMapper.countByFiltersAndGroupIds(
                    groupIds,
                    request.getJobId(),
                    request.getSystemId(),
                    request.getIsEnabled(),
                    request.getCurrentState(),
                    request.getTextSearch()
            );
        }
    }

    @Transactional(readOnly = true)
    public JobVO getJob(String jobId) {
        return jobMapper.findByIdWithRelations(jobId);
    }

    @Transactional
    public JobVO createJob(JobRequest request) {
        if (jobMapper.existsByJobName(request.getJobName())) {
            throw new IllegalArgumentException("Job name already exists: " + request.getJobName());
        }

        // Validate server and group
        if (request.getSystemId() != null && serverMapper.findById(request.getSystemId()) == null) {
            throw new IllegalArgumentException("Server not found: " + request.getSystemId());
        }
        if (request.getGroupId() != null && groupMapper.findById(request.getGroupId()) == null) {
            throw new IllegalArgumentException("Group not found: " + request.getGroupId());
        }

        long now = System.currentTimeMillis();
        String currentUserId = securityUtils.getCurrentId();

        JobVO job = JobVO.builder()
                .jobId(UUID.randomUUID().toString())
                .jobName(request.getJobName())
                .systemId(request.getSystemId())
                .groupId(request.getGroupId())
                .jobType(request.getJobType())
                .jobAction(request.getJobAction())
                .jobBody(request.getJobBody())
                .jobComments(request.getJobComments())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .repeatInterval(request.getRepeatInterval())
                .timezone(request.getTimezone())
                .maxRun(request.getMaxRun())
                .maxFailure(request.getMaxFailure())
                .maxRunDuration(request.getMaxRunDuration())
                .retryDelay(request.getRetryDelay())
                .priority(request.getPriority())
                .isEnabled(request.getIsEnabled())
                .currentState("SCHEDULED")
                .runCount(0)
                .failureCount(0)
                .retryCount(0)
                .autoDrop(request.getAutoDrop())
                .restartOnFailure(request.getRestartOnFailure())
                .restartable(request.getRestartable())
                .ignoreResult(request.getIgnoreResult())
                .runForever(request.getRunForever())
                .frstRegDate(now)
                .lastChgDate(now)
                .frstRegUserId(currentUserId)
                .lastRegUserId(currentUserId)
                .build();

        jobMapper.insert(job);
        return jobMapper.findByIdWithRelations(job.getJobId());
    }

    @Transactional
    public JobVO updateJob(JobRequest request) {
        JobVO existing = jobMapper.findById(request.getJobId());
        if (existing == null) {
            throw new IllegalArgumentException("Job not found: " + request.getJobId());
        }

        // Check for duplicate name
        JobVO byName = jobMapper.findByJobName(request.getJobName());
        if (byName != null && !byName.getJobId().equals(request.getJobId())) {
            throw new IllegalArgumentException("Job name already exists: " + request.getJobName());
        }

        existing.setJobName(request.getJobName());
        existing.setSystemId(request.getSystemId());
        existing.setGroupId(request.getGroupId());
        existing.setJobType(request.getJobType());
        existing.setJobAction(request.getJobAction());
        existing.setJobBody(request.getJobBody());
        existing.setJobComments(request.getJobComments());
        existing.setStartDate(request.getStartDate());
        existing.setEndDate(request.getEndDate());
        existing.setRepeatInterval(request.getRepeatInterval());
        existing.setTimezone(request.getTimezone());
        existing.setMaxRun(request.getMaxRun());
        existing.setMaxFailure(request.getMaxFailure());
        existing.setMaxRunDuration(request.getMaxRunDuration());
        existing.setRetryDelay(request.getRetryDelay());
        existing.setPriority(request.getPriority());
        existing.setIsEnabled(request.getIsEnabled());
        existing.setAutoDrop(request.getAutoDrop());
        existing.setRestartOnFailure(request.getRestartOnFailure());
        existing.setRestartable(request.getRestartable());
        existing.setIgnoreResult(request.getIgnoreResult());
        existing.setRunForever(request.getRunForever());
        existing.setLastChgDate(System.currentTimeMillis());
        existing.setLastRegUserId(securityUtils.getCurrentId());

        jobMapper.update(existing);
        return jobMapper.findByIdWithRelations(existing.getJobId());
    }

    @Transactional
    public void deleteJob(String jobId) {
        JobVO existing = jobMapper.findById(jobId);
        if (existing == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // Delete related logs
        jobRunLogMapper.deleteByJobId(jobId);
        jobMapper.delete(jobId);
    }

    @Transactional
    public JobRunLogVO manuallyRunJob(String jobId) {
        JobVO job = jobMapper.findByIdWithRelations(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        if (!job.getIsEnabled()) {
            throw new IllegalStateException("Job is disabled");
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
                .batchType("Manual")
                .status("PENDING")
                .reqStartDate(now)
                .retryCount(0)
                .build();

        jobRunLogMapper.insert(runLog);

        // Update job state
        jobMapper.updateState(jobId, "RUNNING", null);

        log.info("Manually triggered job: {} (logId: {})", jobId, runLog.getLogId());
        return runLog;
    }

    @Transactional
    public void forceStopJob(String jobId) {
        JobVO job = jobMapper.findById(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // Update job state
        jobMapper.updateState(jobId, "STOPPED", null);

        // Get latest run log and update status
        JobRunLogVO latestLog = jobRunLogMapper.findLatestByJobId(jobId);
        if (latestLog != null && "RUNNING".equals(latestLog.getStatus())) {
            jobRunLogMapper.updateStatus(
                    latestLog.getLogId(),
                    "REVOKED",
                    System.currentTimeMillis(),
                    null,
                    null,
                    "Force stopped by user",
                    null
            );
        }

        log.info("Force stopped job: {}", jobId);
    }
}
