package com.tes.batch.scheduler.domain.job.service;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.enums.JobType;
import com.tes.batch.scheduler.domain.group.mapper.JobGroupMapper;
import com.tes.batch.scheduler.domain.job.dto.JobFilterRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRequest;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.message.RedisMessagePublisher;
import com.tes.batch.scheduler.scheduler.SchedulerService;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final JobGroupMapper groupMapper;
    private final JobServerMapper serverMapper;
    private final SecurityUtils securityUtils;
    private final RedisMessagePublisher redisMessagePublisher;
    @Lazy
    private final SchedulerService schedulerService;

    @Transactional(readOnly = true)
    public List<JobVO> getJobs(JobFilterRequest request) {
        // Frontend uses 1-indexed page_number
        int page = request.getPage() > 0 ? request.getPage() - 1 : 0;
        int offset = page * request.getSize();

        List<JobVO> jobs;
        if (securityUtils.isAdmin()) {
            jobs = jobMapper.findByFilters(
                    request.getJobId(),
                    request.getGroupId(),
                    request.getSystemId(),
                    request.getIsEnabled(),
                    request.getCurrentState(),
                    request.getTextSearch(),
                    request.getWfRegistered(),
                    request.getLastResult(),
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
            // If user selected a specific group, filter to only that group (if allowed)
            if (request.getGroupId() != null && !request.getGroupId().isEmpty()) {
                if (groupIds.contains(request.getGroupId())) {
                    groupIds = Set.of(request.getGroupId());
                } else {
                    // User tried to filter by a group they don't have access to
                    return List.of();
                }
            }
            jobs = jobMapper.findByFiltersAndGroupIds(
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

        // Set schedule string for each job
        jobs.forEach(job -> job.setSchedule(getScheduleString(job.getRepeatInterval())));

        return jobs;
    }

    /**
     * Parse RRULE and return schedule string like "DAILY(1)", "HOURLY(2)"
     */
    private String getScheduleString(String repeatInterval) {
        if (repeatInterval == null || repeatInterval.isEmpty()) {
            return null;
        }
        try {
            // Parse RRULE format: FREQ=DAILY;INTERVAL=1 -> "DAILY(1)"
            Pattern freqPattern = Pattern.compile("FREQ=([A-Z]+)");
            Pattern intervalPattern = Pattern.compile("INTERVAL=(\\d+)");

            Matcher freqMatcher = freqPattern.matcher(repeatInterval);
            Matcher intervalMatcher = intervalPattern.matcher(repeatInterval);

            String freq = freqMatcher.find() ? freqMatcher.group(1) : null;
            String interval = intervalMatcher.find() ? intervalMatcher.group(1) : "1";

            if (freq != null) {
                return freq + "(" + interval + ")";
            }
            return repeatInterval;
        } catch (Exception e) {
            log.warn("Failed to parse repeat interval: {}", repeatInterval);
            return repeatInterval;
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
                    request.getLastResult(),
                    request.getLastStartDateFrom(),
                    request.getLastStartDateTo()
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return 0;
            }
            // If user selected a specific group, filter to only that group (if allowed)
            if (request.getGroupId() != null && !request.getGroupId().isEmpty()) {
                if (groupIds.contains(request.getGroupId())) {
                    groupIds = Set.of(request.getGroupId());
                } else {
                    // User tried to filter by a group they don't have access to
                    return 0;
                }
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
                .secondarySystemId(request.getSecondarySystemId())
                .tertiarySystemId(request.getTertiarySystemId())
                .groupId(request.getGroupId())
                .jobType(request.getJobType())
                .jobAction(request.getJobAction())
                .jobBody(request.getJobBody())
                .jobHeaders(request.getJobHeaders())
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

        // Calculate next run date if repeat interval is set
        if (job.getRepeatInterval() != null && !job.getRepeatInterval().isEmpty()) {
            Long nextRunDate = schedulerService.calculateNextRunDate(job);
            job.setNextRunDate(nextRunDate);
            log.info("Calculated next_run_date for new job {}: {}", job.getJobId(), nextRunDate);
        }

        jobMapper.insert(job);

        // Schedule with Quartz if enabled and has repeat interval
        if (Boolean.TRUE.equals(job.getIsEnabled()) && job.getRepeatInterval() != null && !job.getRepeatInterval().isEmpty()) {
            schedulerService.scheduleJobWithRRule(job);
            log.info("Scheduled new job with Quartz: {}", job.getJobId());
        }

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
        existing.setSecondarySystemId(request.getSecondarySystemId());
        existing.setTertiarySystemId(request.getTertiarySystemId());
        existing.setGroupId(request.getGroupId());
        existing.setJobType(request.getJobType());
        existing.setJobAction(request.getJobAction());
        existing.setJobBody(request.getJobBody());
        existing.setJobHeaders(request.getJobHeaders());
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

        // Recalculate next run date if repeat interval changed
        if (existing.getRepeatInterval() != null && !existing.getRepeatInterval().isEmpty()) {
            Long nextRunDate = schedulerService.calculateNextRunDate(existing);
            existing.setNextRunDate(nextRunDate);
            log.info("Recalculated next_run_date for job {}: {}", existing.getJobId(), nextRunDate);
        } else {
            existing.setNextRunDate(null);
        }

        jobMapper.update(existing);

        // Update Quartz schedule
        if (Boolean.TRUE.equals(existing.getIsEnabled()) && existing.getRepeatInterval() != null && !existing.getRepeatInterval().isEmpty()) {
            schedulerService.scheduleJobWithRRule(existing);
            log.info("Rescheduled job with Quartz: {}", existing.getJobId());
        } else {
            schedulerService.unscheduleJob(existing.getJobId());
            log.info("Unscheduled job from Quartz: {}", existing.getJobId());
        }

        return jobMapper.findByIdWithRelations(existing.getJobId());
    }

    @Transactional
    public void deleteJob(String jobId) {
        JobVO existing = jobMapper.findById(jobId);
        if (existing == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // If job is running or waiting, stop it first
        if ("RUNNING".equals(existing.getCurrentState()) || "WAITING".equals(existing.getCurrentState())) {
            log.info("Stopping running job before deletion: {}", jobId);
            // Update latest run log status to REVOKED
            JobRunLogVO latestLog = jobRunLogMapper.findLatestByJobId(jobId);
            if (latestLog != null && ("RUNNING".equals(latestLog.getStatus()) || "PENDING".equals(latestLog.getStatus()))) {
                jobRunLogMapper.updateStatus(
                        latestLog.getLogId(),
                        "REVOKED",
                        "REVOKED",
                        null,
                        System.currentTimeMillis(),
                        null,
                        "Job deleted while running",
                        null,
                        null
                );
            }
        }

        // Unschedule from Quartz
        schedulerService.unscheduleJob(jobId);

        // If job is part of a workflow, just remove from workflow (don't delete workflow)
        if (existing.getWorkflowId() != null) {
            log.info("Removing job from workflow before deletion: jobId={}, workflowId={}",
                    jobId, existing.getWorkflowId());
            // Clear workflow info from the job (the job record will be deleted anyway)
        }

        // DON'T delete logs - keep them for audit trail
        // jobRunLogMapper.deleteByJobId(jobId);

        // Delete the job
        jobMapper.delete(jobId);

        log.info("Deleted job (logs preserved): {}", jobId);
    }

    @Transactional
    public JobRunLogVO manuallyRunJob(String jobId) {
        JobVO job = jobMapper.findByIdWithRelations(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // Block manual execution if job is disabled
        if (!Boolean.TRUE.equals(job.getIsEnabled())) {
            throw new IllegalStateException("Cannot execute disabled job. Please enable the job first.");
        }

        // Get available server with failover support (primary -> secondary -> tertiary)
        JobServerVO server = getAvailableServer(job);

        if (server == null) {
            throw new IllegalStateException("No healthy server available (tried primary, secondary, tertiary)");
        }

        String queueName = server.getQueueName();
        if (queueName == null || queueName.isEmpty()) {
            throw new IllegalStateException("No queue configured for server: " + server.getSystemName());
        }

        // Log which server was selected
        String serverRole = determineServerRole(job, server.getSystemId());
        log.info("Manual execution using {} server: {} ({})", serverRole, server.getSystemName(), server.getSystemId());

        // Create run log with all denormalized fields
        // Note: Log the actual server used (may differ from job's primary if failover occurred)
        long now = System.currentTimeMillis();
        String taskId = UUID.randomUUID().toString();
        String currentUserName = securityUtils.getCurrentUserId();
        JobRunLogVO runLog = JobRunLogVO.builder()
                .jobId(jobId)
                .jobName(job.getJobName())
                .systemId(server.getSystemId())  // Use actual server used (may be failover)
                .systemName(server.getSystemName())
                .groupId(job.getGroupId())
                .groupName(job.getGroupName())
                .celeryTaskName(taskId)  // maps to task_id
                .batchType("Manual")     // manual execution
                .operation("RUN")        // job is running
                .status("PENDING")
                .reqStartDate(now)       // maps to scheduled_time
                .actualStartDate(now)    // maps to start_time
                .retryCount(0)           // maps to retry_attempt
                .userName(currentUserName) // user who manually executed the job
                .build();

        jobRunLogMapper.insert(runLog);

        // Update job state and lastStartDate
        jobMapper.updateStateWithLastStart(jobId, "RUNNING", null, now);

        // Build and publish job message to Redis
        JobMessage message = JobMessage.builder()
                .jobId(jobId)
                .taskId(String.valueOf(runLog.getLogId()))  // Use logId as taskId for tracking
                .jobName(job.getJobName())
                .jobType(JobType.valueOf(job.getJobType()))
                .jobAction(job.getJobAction())
                .jobBody(job.getJobBody())
                .jobHeaders(job.getJobHeaders())
                .maxDurationSeconds(parseMaxDuration(job.getMaxRunDuration()))
                .retryCount(job.getMaxFailure() != null ? job.getMaxFailure() : 0)
                .retryDelay(job.getRetryDelay() != null ? job.getRetryDelay() : 0)
                .priority(job.getPriority() != null ? job.getPriority() : 3)
                .queueName(queueName)
                .scheduledTime(now)
                .manuallyRun(true)
                .build();

        redisMessagePublisher.publishJob(queueName, message);

        log.info("Manually triggered job: {} (logId: {}, queue: {})", jobId, runLog.getLogId(), queueName);
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
                    "REVOKED",
                    null,
                    System.currentTimeMillis(),
                    null,
                    "Force stopped by user",
                    null,
                    null
            );
        }

        log.info("Force stopped job: {}", jobId);
    }

    @Transactional
    public void updateJobStatus(String jobId, Boolean isEnabled) {
        JobVO job = jobMapper.findById(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Job not found: " + jobId);
        }

        // Update job enabled status and state
        String newState = isEnabled ? "SCHEDULED" : "DISABLED";
        job.setIsEnabled(isEnabled);
        job.setCurrentState(newState);
        job.setLastChgDate(System.currentTimeMillis());
        job.setLastRegUserId(securityUtils.getCurrentId());

        jobMapper.update(job);

        // Update Quartz schedule based on enabled status
        if (isEnabled && job.getRepeatInterval() != null && !job.getRepeatInterval().isEmpty()) {
            schedulerService.scheduleJobWithRRule(job);
            log.info("Enabled and scheduled job with Quartz: {}", jobId);
        } else {
            schedulerService.unscheduleJob(jobId);
            log.info("Disabled and unscheduled job from Quartz: {}", jobId);
        }

        log.info("Updated job status: jobId={}, isEnabled={}, newState={}", jobId, isEnabled, newState);
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
}
