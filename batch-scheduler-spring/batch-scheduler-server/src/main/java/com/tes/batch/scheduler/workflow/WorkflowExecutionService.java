package com.tes.batch.scheduler.workflow;

import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.WorkflowMessage;
import com.tes.batch.common.enums.JobType;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowPriorityGroupMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowRunMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import com.tes.batch.scheduler.message.RedisMessagePublisher;
import com.tes.batch.scheduler.scheduler.RRuleParser;
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
    private final JobServerMapper serverMapper;
    private final RedisMessagePublisher messagePublisher;
    private final RRuleParser rruleParser;

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

        // Create workflow run record
        WorkflowRunVO workflowRun = WorkflowRunVO.builder()
                .workflowId(workflow.getId())
                .workflowName(workflow.getWorkflowName())
                .startDate(System.currentTimeMillis())
                .status("RUNNING")
                .build();

        // Count total jobs
        List<WorkflowPriorityGroupVO> priorityGroups = priorityGroupMapper.findByWorkflowId(workflow.getId());
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

        // Sort by priority
        priorityGroups.sort(Comparator.comparing(WorkflowPriorityGroupVO::getPriority));

        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            List<JobMessage> jobMessages = new ArrayList<>();

            for (JobVO job : jobs) {
                JobMessage jobMessage = JobMessage.builder()
                        .jobId(job.getJobId())
                        .jobName(job.getJobName())
                        .jobType(JobType.valueOf(job.getJobType()))
                        .jobAction(job.getJobAction())
                        .jobBody(job.getJobBody())
                        .maxDurationSeconds(job.getMaxRunDuration() != null ? job.getMaxRunDuration() : 3600L)
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
     * Determine target queue from jobs in priority groups
     */
    private String determineTargetQueue(List<WorkflowPriorityGroupVO> priorityGroups) {
        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            for (JobVO job : jobs) {
                if (job.getSystemId() != null) {
                    JobServerVO server = serverMapper.findById(job.getSystemId());
                    if (server != null && server.getQueueName() != null) {
                        return server.getQueueName();
                    }
                }
            }
        }
        return null;
    }

    /**
     * Handle workflow completion result from agent
     */
    @Transactional
    public void handleWorkflowResult(String workflowId, Long workflowRunId, String status,
                                      String errorMessage, Long startTime, Long endTime, Long durationMs) {
        log.info("Handling workflow result: {} (runId: {}) - {}", workflowId, workflowRunId, status);

        // Update workflow run
        workflowRunMapper.updateStatus(workflowRunId, status, endTime, durationMs, errorMessage);

        // Update workflow
        WorkflowVO workflow = workflowMapper.findById(workflowId);
        if (workflow != null) {
            // Calculate next run date
            Long nextRunDate = null;
            if (workflow.getRepeatInterval() != null && !workflow.getRepeatInterval().isEmpty()) {
                try {
                    String timezone = workflow.getTimezone() != null ? workflow.getTimezone() : "Asia/Seoul";
                    nextRunDate = rruleParser.getNextRunTime(
                            workflow.getRepeatInterval(),
                            System.currentTimeMillis(),
                            ZoneId.of(timezone)
                    );
                } catch (Exception e) {
                    log.warn("Failed to calculate next run date for workflow: {}", workflowId, e);
                }
            }

            workflowMapper.updateStatus(workflowId, status, endTime, nextRunDate);
        }
    }
}
