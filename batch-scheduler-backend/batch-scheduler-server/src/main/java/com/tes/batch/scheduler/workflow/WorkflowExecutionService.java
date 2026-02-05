package com.tes.batch.scheduler.workflow;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.WorkflowMessage;
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
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowPriorityGroupMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowRunMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import com.tes.batch.scheduler.message.RedisMessagePublisher;
import com.tes.batch.scheduler.scheduler.RRuleParser;
import com.tes.batch.scheduler.scheduler.SchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Service for executing workflows
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowExecutionService {

    private final WorkflowMapper workflowMapper;
    private final WorkflowPriorityGroupMapper priorityGroupMapper;
    private final WorkflowRunMapper workflowRunMapper;
    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final JobGroupMapper groupMapper;
    private final JobServerMapper serverMapper;
    private final UserMapper userMapper;
    private final RedisMessagePublisher messagePublisher;
    private final RRuleParser rruleParser;
    private final SchedulerService schedulerService;

    /**
     * Execute a workflow by ID
     */
    @Transactional
    public Long executeWorkflow(String workflowId) {
        WorkflowVO workflow = workflowMapper.findById(workflowId);
        if (workflow == null) {
            throw new IllegalArgumentException("Workflow not found: " + workflowId);
        }

        return executeWorkflow(workflow);
    }

    /**
     * Execute a workflow
     */
    @Transactional
    public Long executeWorkflow(WorkflowVO workflow) {
        log.info("Starting workflow execution: {}", workflow.getWorkflowName());

        // Pre-check: Verify all jobs have at least one healthy server available
        List<WorkflowPriorityGroupVO> priorityGroups = priorityGroupMapper.findByWorkflowId(workflow.getId());
        String preCheckError = preCheckServerAvailability(priorityGroups);
        if (preCheckError != null) {
            log.error("Workflow pre-check failed: {}", preCheckError);
            // Create failed workflow run record
            long now = System.currentTimeMillis();
            WorkflowRunVO failedRun = WorkflowRunVO.builder()
                    .workflowId(workflow.getId())
                    .workflowName(workflow.getWorkflowName())
                    .startDate(now)
                    .endDate(now)
                    .status("FAILED")
                    .errorMessage(preCheckError)
                    .build();
            workflowRunMapper.insert(failedRun);

            // Update workflow status and schedule next run
            Long nextRunDate = schedulerService.calculateNextRunDate(workflow);
            workflowMapper.updateStatus(workflow.getId(), "FAILED", now, nextRunDate);
            if (nextRunDate != null) {
                schedulerService.scheduleWorkflow(workflow.getId(), nextRunDate);
            }

            return failedRun.getWorkflowRunId();
        }

        // Create workflow run record
        WorkflowRunVO workflowRun = WorkflowRunVO.builder()
                .workflowId(workflow.getId())
                .workflowName(workflow.getWorkflowName())
                .startDate(System.currentTimeMillis())
                .status("RUNNING")
                .build();

        // Count total jobs
        int totalJobs = 0;
        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            totalJobs += jobs.size();
        }
        workflowRun.setTotalJobs(totalJobs);

        workflowRunMapper.insert(workflowRun);
        Long workflowRunId = workflowRun.getWorkflowRunId();

        // Update workflow status
        workflowMapper.updateStatus(workflow.getId(), "RUNNING", System.currentTimeMillis(), null);

        // Build workflow message
        WorkflowMessage message = buildWorkflowMessage(workflow, workflowRunId, priorityGroups);

        // Determine target queue (use first job's server queue)
        String targetQueue = determineTargetQueue(priorityGroups);
        if (targetQueue == null) {
            log.error("No target queue found for workflow: {}", workflow.getWorkflowName());
            workflowRunMapper.updateStatus(workflowRunId, "FAILED", System.currentTimeMillis(),
                    System.currentTimeMillis() - workflowRun.getStartDate(), "No target queue found");
            workflowMapper.updateStatus(workflow.getId(), "FAILED", System.currentTimeMillis(), null);
            return workflowRunId;
        }

        message.setQueueName(targetQueue);

        // Update all workflow jobs state to WAITING (queued for workflow execution)
        // Actual RUNNING state is set when agent reports each job starting
        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            for (JobVO job : jobs) {
                jobMapper.updateState(job.getJobId(), "WAITING", null);
            }
        }

        // Publish workflow message to agent
        messagePublisher.publishWorkflow(targetQueue, message);

        log.info("Workflow execution started: {} (runId: {})", workflow.getWorkflowName(), workflowRunId);
        return workflowRunId;
    }

    /**
     * Build workflow message from workflow and priority groups
     */
    private WorkflowMessage buildWorkflowMessage(WorkflowVO workflow, Long workflowRunId,
                                                   List<WorkflowPriorityGroupVO> priorityGroups) {
        List<WorkflowMessage.PriorityGroup> pgMessages = new ArrayList<>();
        long now = System.currentTimeMillis();

        // Sort by priority
        priorityGroups.sort(Comparator.comparing(WorkflowPriorityGroupVO::getPriority));

        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            List<JobMessage> jobMessages = new ArrayList<>();

            for (JobVO job : jobs) {
                // Get group/server info for denormalization (with failover support)
                JobGroupVO group = job.getGroupId() != null ? groupMapper.findById(job.getGroupId()) : null;
                JobServerVO server = getAvailableServer(job);

                // Get job creator's user ID for logging
                String creatorUserId = null;
                if (job.getFrstRegUserId() != null) {
                    UserVO creator = userMapper.findById(job.getFrstRegUserId());
                    if (creator != null) {
                        creatorUserId = creator.getUserId();
                    }
                }

                // Skip disabled jobs - create log entry with SKIPPED status
                if (!Boolean.TRUE.equals(job.getIsEnabled())) {
                    JobRunLogVO skippedLog = JobRunLogVO.builder()
                            .jobId(job.getJobId())
                            .jobName(job.getJobName())
                            .systemId(job.getSystemId())
                            .systemName(server != null ? server.getSystemName() : null)
                            .groupId(job.getGroupId())
                            .groupName(group != null ? group.getGroupName() : null)
                            .batchType("Auto")
                            .operation("SKIPPED")
                            .status("SKIPPED")
                            .reqStartDate(now)
                            .actualStartDate(now)
                            .actualEndDate(now)
                            .runDuration("00:00:00")
                            .retryCount(0)
                            .workflowRunId(workflowRunId)
                            .workflowPriority(pg.getPriority())
                            .userName(creatorUserId)
                            .additionalInfo("Job is disabled")
                            .build();

                    jobRunLogMapper.insert(skippedLog);
                    log.info("Skipped disabled job in workflow: logId={}, jobId={}, workflowRunId={}",
                            skippedLog.getLogId(), job.getJobId(), workflowRunId);
                    continue; // Don't add to job messages - skip execution
                }

                // Skip jobs that reached maxRun - create log entry with SKIPPED status
                if (job.getMaxRun() != null && job.getMaxRun() > 0 &&
                    job.getRunCount() != null && job.getRunCount() >= job.getMaxRun()) {
                    JobRunLogVO skippedLog = JobRunLogVO.builder()
                            .jobId(job.getJobId())
                            .jobName(job.getJobName())
                            .systemId(job.getSystemId())
                            .systemName(server != null ? server.getSystemName() : null)
                            .groupId(job.getGroupId())
                            .groupName(group != null ? group.getGroupName() : null)
                            .batchType("Auto")
                            .operation("SKIPPED")
                            .status("SKIPPED")
                            .reqStartDate(now)
                            .actualStartDate(now)
                            .actualEndDate(now)
                            .runDuration("00:00:00")
                            .retryCount(0)
                            .workflowRunId(workflowRunId)
                            .workflowPriority(pg.getPriority())
                            .userName(creatorUserId)
                            .additionalInfo(String.format("Max run count reached (%d/%d)",
                                    job.getRunCount(), job.getMaxRun()))
                            .build();

                    jobRunLogMapper.insert(skippedLog);
                    // Update job state to COMPLETED
                    jobMapper.updateState(job.getJobId(), "COMPLETED", null);
                    log.info("Skipped job in workflow (maxRun reached): logId={}, jobId={}, runCount={}, maxRun={}, workflowRunId={}",
                            skippedLog.getLogId(), job.getJobId(), job.getRunCount(), job.getMaxRun(), workflowRunId);
                    continue; // Don't add to job messages - skip execution
                }

                // Create job run log entry with workflow_run_id (using failover server if applicable)
                JobRunLogVO runLog = JobRunLogVO.builder()
                        .jobId(job.getJobId())
                        .jobName(job.getJobName())
                        .systemId(server != null ? server.getSystemId() : job.getSystemId())
                        .systemName(server != null ? server.getSystemName() : null)
                        .groupId(job.getGroupId())
                        .groupName(group != null ? group.getGroupName() : null)
                        .batchType("Auto")
                        .operation("RUN")
                        .status("PENDING")
                        .reqStartDate(now)
                        .retryCount(0)
                        .workflowRunId(workflowRunId)
                        .workflowPriority(pg.getPriority())
                        .userName(creatorUserId)
                        .build();

                jobRunLogMapper.insert(runLog);
                log.info("Created workflow job run log: logId={}, jobId={}, workflowRunId={}, priority={}",
                        runLog.getLogId(), job.getJobId(), workflowRunId, pg.getPriority());

                // Set taskId to logId so agent sends it back for status updates
                JobMessage jobMessage = JobMessage.builder()
                        .jobId(job.getJobId())
                        .taskId(String.valueOf(runLog.getLogId()))
                        .jobName(job.getJobName())
                        .jobType(JobType.valueOf(job.getJobType()))
                        .jobAction(job.getJobAction())
                        .jobBody(job.getJobBody())
                        .jobHeaders(job.getJobHeaders())
                        .maxDurationSeconds(parseDurationToSeconds(job.getMaxRunDuration()))
                        .retryCount(0)
                        .workflowRunId(workflowRunId)
                        .priority(job.getPriority())
                        .executionDelay(job.getWorkflowDelay())
                        .ignoreResult(job.getIgnoreResult())
                        .build();

                jobMessages.add(jobMessage);
            }

            WorkflowMessage.PriorityGroup pgMessage = WorkflowMessage.PriorityGroup.builder()
                    .priority(pg.getPriority())
                    .ignoreResult(pg.getIgnoreResult())
                    .jobs(jobMessages)
                    .build();

            pgMessages.add(pgMessage);
        }

        return WorkflowMessage.builder()
                .workflowId(workflow.getId())
                .workflowRunId(workflowRunId)
                .workflowName(workflow.getWorkflowName())
                .priorityGroups(pgMessages)
                .build();
    }

    /**
     * Determine target queue from jobs in priority groups (with failover support)
     */
    private String determineTargetQueue(List<WorkflowPriorityGroupVO> priorityGroups) {
        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            for (JobVO job : jobs) {
                JobServerVO server = getAvailableServer(job);
                if (server != null && server.getQueueName() != null) {
                    return server.getQueueName();
                }
            }
        }
        return null;
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

        // Fallback: return primary server even if unhealthy (let the workflow fail with clear error)
        if (job.getSystemId() != null) {
            return serverMapper.findById(job.getSystemId());
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
     * Pre-check server availability for all jobs in the workflow.
     * Returns error message if any job has no healthy server, null if all OK.
     */
    private String preCheckServerAvailability(List<WorkflowPriorityGroupVO> priorityGroups) {
        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            for (JobVO job : jobs) {
                // Skip disabled jobs
                if (!Boolean.TRUE.equals(job.getIsEnabled())) {
                    continue;
                }
                // Skip jobs that reached maxRun
                if (job.getMaxRun() != null && job.getMaxRun() > 0 &&
                    job.getRunCount() != null && job.getRunCount() >= job.getMaxRun()) {
                    continue;
                }

                // Check if any server is available for this job
                boolean hasHealthyServer = false;

                if (job.getSystemId() != null) {
                    JobServerVO primary = serverMapper.findById(job.getSystemId());
                    if (isServerAvailable(primary)) {
                        hasHealthyServer = true;
                    }
                }
                if (!hasHealthyServer && job.getSecondarySystemId() != null) {
                    JobServerVO secondary = serverMapper.findById(job.getSecondarySystemId());
                    if (isServerAvailable(secondary)) {
                        hasHealthyServer = true;
                    }
                }
                if (!hasHealthyServer && job.getTertiarySystemId() != null) {
                    JobServerVO tertiary = serverMapper.findById(job.getTertiarySystemId());
                    if (isServerAvailable(tertiary)) {
                        hasHealthyServer = true;
                    }
                }

                if (!hasHealthyServer) {
                    return String.format("No healthy server available for job '%s'. Please check server status or add backup servers.",
                            job.getJobName());
                }
            }
        }
        return null; // All jobs have healthy servers
    }

    /**
     * Handle workflow completion result from agent
     */
    @Transactional
    public void handleWorkflowResult(String workflowId, Long workflowRunId, String status,
                                      String errorMessage, Long startTime, Long endTime, Long durationMs) {
        log.info("Handling workflow result: {} (runId: {}) - {}", workflowId, workflowRunId, status);

        // Use server time for end_date to avoid clock drift between server and agent
        long now = System.currentTimeMillis();
        WorkflowRunVO run = workflowRunMapper.findById(workflowRunId);
        Long actualDuration = (run != null && run.getStartDate() != null) ? now - run.getStartDate() : durationMs;

        // Update workflow run
        workflowRunMapper.updateStatus(workflowRunId, status, now, actualDuration, errorMessage);

        // Update workflow
        WorkflowVO workflow = workflowMapper.findById(workflowId);
        if (workflow != null) {
            // Calculate next run date (uses SchedulerService for :00 second normalization)
            Long nextRunDate = schedulerService.calculateNextRunDate(workflow);

            workflowMapper.updateStatus(workflowId, status, now, nextRunDate);

            // Reset workflow jobs to SCHEDULED after workflow completes
            // But keep jobs that reached maxRun as COMPLETED
            List<WorkflowPriorityGroupVO> priorityGroups = priorityGroupMapper.findByWorkflowId(workflowId);
            int resetCount = 0;
            int completedCount = 0;
            for (WorkflowPriorityGroupVO pg : priorityGroups) {
                List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
                for (JobVO job : jobs) {
                    // Check if job reached maxRun - keep as COMPLETED
                    if (job.getMaxRun() != null && job.getMaxRun() > 0 &&
                        job.getRunCount() != null && job.getRunCount() >= job.getMaxRun()) {
                        jobMapper.updateState(job.getJobId(), "COMPLETED", null);
                        completedCount++;
                        log.debug("Job {} stays COMPLETED (maxRun reached: {}/{})",
                                job.getJobId(), job.getRunCount(), job.getMaxRun());
                    } else {
                        jobMapper.updateState(job.getJobId(), "SCHEDULED", null);
                        resetCount++;
                    }
                }
            }
            log.info("Workflow {} completed with status {}, reset {} job(s) to SCHEDULED, {} job(s) stay COMPLETED (maxRun reached)",
                    workflowId, status, resetCount, completedCount);

            // Schedule next run with Quartz (moved here from BatchWorkflowExecutor
            // so rescheduling happens AFTER completion, preventing overlapping executions)
            if (nextRunDate != null) {
                schedulerService.scheduleWorkflow(workflowId, nextRunDate);
                log.info("Rescheduled workflow {} for next run after completion", workflowId);
            }
        }
    }

    /**
     * Parse duration string (HH:MM:SS) to seconds
     */
    private Long parseDurationToSeconds(String duration) {
        if (duration == null || duration.isEmpty()) {
            return 3600L; // Default 1 hour
        }

        try {
            String[] parts = duration.split(":");
            if (parts.length == 3) {
                long hours = Long.parseLong(parts[0]);
                long minutes = Long.parseLong(parts[1]);
                long seconds = Long.parseLong(parts[2]);
                return hours * 3600 + minutes * 60 + seconds;
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid duration format: {}", duration);
        }

        return 3600L; // Default 1 hour
    }
}
