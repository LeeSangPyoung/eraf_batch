package com.tes.batch.scheduler.domain.workflow.service;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.workflow.dto.*;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowPriorityGroupMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowRunMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import com.tes.batch.scheduler.scheduler.RRuleParser;
import com.tes.batch.scheduler.scheduler.SchedulerService;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowMapper workflowMapper;
    private final WorkflowPriorityGroupMapper priorityGroupMapper;
    private final WorkflowRunMapper workflowRunMapper;
    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final RRuleParser rruleParser;
    private final SecurityUtils securityUtils;
    @Lazy
    private final SchedulerService schedulerService;

    @Transactional(readOnly = true)
    public ApiResponse<List<WorkflowResponse>> filter(WorkflowFilterRequest request) {
        int offset = (request.getPage() - 1) * request.getPageSize();

        List<WorkflowVO> workflows;
        int total;

        log.info("Workflow filter - isAdmin: {}, userType: {}", securityUtils.isAdmin(), securityUtils.getCurrentUserType());

        if (securityUtils.isAdmin()) {
            workflows = workflowMapper.findByFilters(
                    request.getWorkflowName(),
                    request.getGroupId(),
                    request.getLatestStatus(),
                    null,  // textSearch
                    request.getPageSize(),
                    offset
            );

            total = (int) workflowMapper.countByFilters(
                    request.getWorkflowName(),
                    request.getGroupId(),
                    request.getLatestStatus(),
                    null  // textSearch
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            log.info("Workflow filter - user groupIds: {}", groupIds);
            if (groupIds.isEmpty()) {
                log.info("Workflow filter - returning empty because groupIds is empty");
                return ApiResponse.successWithTotal(List.of(), 0);
            }
            // If user selected a specific group, filter to only that group (if allowed)
            if (request.getGroupId() != null && !request.getGroupId().isEmpty()) {
                if (groupIds.contains(request.getGroupId())) {
                    groupIds = Set.of(request.getGroupId());
                } else {
                    log.info("Workflow filter - returning empty because user doesn't have access to requested group: {}", request.getGroupId());
                    return ApiResponse.successWithTotal(List.of(), 0);
                }
            }

            workflows = workflowMapper.findByFiltersAndGroupIds(
                    groupIds,
                    request.getWorkflowName(),
                    request.getLatestStatus(),
                    request.getPageSize(),
                    offset
            );

            total = (int) workflowMapper.countByFiltersAndGroupIds(
                    groupIds,
                    request.getWorkflowName(),
                    request.getLatestStatus()
            );
        }

        List<WorkflowResponse> responses = workflows.stream()
                .map(WorkflowResponse::from)
                .collect(Collectors.toList());

        return ApiResponse.successWithTotal(responses, total);
    }

    @Transactional(readOnly = true)
    public ApiResponse<WorkflowResponse> detail(String workflowId) {
        WorkflowVO workflow = workflowMapper.findByIdWithRelations(workflowId);
        if (workflow == null) {
            return ApiResponse.error("Workflow not found: " + workflowId);
        }

        WorkflowResponse response = WorkflowResponse.from(workflow);

        // Get priority groups
        List<WorkflowPriorityGroupVO> priorityGroups = priorityGroupMapper.findByWorkflowId(workflowId);
        List<WorkflowResponse.PriorityGroupResponse> groupResponses = new ArrayList<>();

        for (WorkflowPriorityGroupVO pg : priorityGroups) {
            WorkflowResponse.PriorityGroupResponse pgResponse = WorkflowResponse.fromPriorityGroup(pg);

            // Get jobs in this priority group
            List<JobVO> jobs = jobMapper.findByPriorityGroupId(pg.getId());
            List<WorkflowResponse.JobInGroupResponse> jobResponses = jobs.stream()
                    .map(job -> WorkflowResponse.JobInGroupResponse.builder()
                            .jobId(job.getJobId())
                            .jobName(job.getJobName())
                            .workflowDelay(job.getWorkflowDelay())
                            .build())
                    .collect(Collectors.toList());

            pgResponse.setJobs(jobResponses);
            groupResponses.add(pgResponse);
        }

        // Sort by priority
        groupResponses.sort(Comparator.comparing(WorkflowResponse.PriorityGroupResponse::getPriority));
        response.setPriorityGroups(groupResponses);

        return ApiResponse.success(response);
    }

    @Transactional
    public ApiResponse<WorkflowResponse> create(WorkflowRequest request) {
        // Admin only
        if (!securityUtils.isAdmin()) {
            return ApiResponse.error("Access denied: Admin only");
        }
        // Check duplicate name
        WorkflowVO existing = workflowMapper.findByName(request.getWorkflowName());
        if (existing != null) {
            return ApiResponse.error("Workflow name already exists: " + request.getWorkflowName());
        }

        // Calculate next run date
        Long nextRunDate = null;
        if (request.getRepeatInterval() != null && !request.getRepeatInterval().isEmpty()) {
            try {
                String timezone = request.getTimezone() != null ? request.getTimezone() : "Asia/Seoul";
                nextRunDate = rruleParser.getNextRunTime(
                        request.getRepeatInterval(),
                        request.getStartDate(),
                        ZoneId.of(timezone)
                );
            } catch (Exception e) {
                log.warn("Failed to parse RRULE: {}", request.getRepeatInterval(), e);
            }
        }

        long now = System.currentTimeMillis();
        String workflowId = UUID.randomUUID().toString();

        WorkflowVO workflow = new WorkflowVO();
        workflow.setId(workflowId);
        workflow.setWorkflowName(request.getWorkflowName());
        workflow.setGroupId(request.getGroupId());
        workflow.setStartDate(request.getStartDate());
        workflow.setRepeatInterval(request.getRepeatInterval());
        workflow.setTimezone(request.getTimezone() != null ? request.getTimezone() : "Asia/Seoul");
        workflow.setNextRunDate(nextRunDate);
        workflow.setLatestStatus("PENDING");
        workflow.setFrstRegDate(now);
        workflow.setLastChgDate(now);

        workflowMapper.insert(workflow);

        // Create priority groups
        if (request.getPriorityGroups() != null) {
            for (WorkflowRequest.PriorityGroupRequest pgRequest : request.getPriorityGroups()) {
                String pgId = UUID.randomUUID().toString();

                WorkflowPriorityGroupVO priorityGroup = new WorkflowPriorityGroupVO();
                priorityGroup.setId(pgId);
                priorityGroup.setWorkflowId(workflowId);
                priorityGroup.setPriority(pgRequest.getPriority());
                priorityGroup.setIgnoreResult(pgRequest.getIgnoreResult() != null ? pgRequest.getIgnoreResult() : false);

                priorityGroupMapper.insert(priorityGroup);

                // Link jobs to priority group
                if (pgRequest.getJobs() != null) {
                    for (WorkflowRequest.JobInGroupRequest jobRequest : pgRequest.getJobs()) {
                        jobMapper.updateWorkflowInfo(
                                jobRequest.getJobId(),
                                workflowId,
                                pgId,
                                jobRequest.getWorkflowDelay()
                        );
                    }
                }
            }
        }

        // Schedule with Quartz if has repeat interval
        if (workflow.getRepeatInterval() != null && !workflow.getRepeatInterval().isEmpty()) {
            schedulerService.scheduleWorkflowWithRRule(workflow);
            log.info("Scheduled new workflow with Quartz: {}", workflowId);
        }

        return detail(workflowId);
    }

    @Transactional
    public ApiResponse<WorkflowResponse> update(WorkflowRequest request) {
        // Admin only
        if (!securityUtils.isAdmin()) {
            return ApiResponse.error("Access denied: Admin only");
        }
        WorkflowVO existing = workflowMapper.findById(request.getId());
        if (existing == null) {
            return ApiResponse.error("Workflow not found: " + request.getId());
        }

        // Check duplicate name (excluding current)
        WorkflowVO nameCheck = workflowMapper.findByName(request.getWorkflowName());
        if (nameCheck != null && !nameCheck.getId().equals(request.getId())) {
            return ApiResponse.error("Workflow name already exists: " + request.getWorkflowName());
        }

        // Calculate next run date
        Long nextRunDate = null;
        if (request.getRepeatInterval() != null && !request.getRepeatInterval().isEmpty()) {
            try {
                String timezone = request.getTimezone() != null ? request.getTimezone() : "Asia/Seoul";
                nextRunDate = rruleParser.getNextRunTime(
                        request.getRepeatInterval(),
                        request.getStartDate(),
                        ZoneId.of(timezone)
                );
            } catch (Exception e) {
                log.warn("Failed to parse RRULE: {}", request.getRepeatInterval(), e);
            }
        }

        existing.setWorkflowName(request.getWorkflowName());
        existing.setGroupId(request.getGroupId());
        existing.setStartDate(request.getStartDate());
        existing.setRepeatInterval(request.getRepeatInterval());
        existing.setTimezone(request.getTimezone() != null ? request.getTimezone() : "Asia/Seoul");
        existing.setNextRunDate(nextRunDate);
        existing.setLastChgDate(System.currentTimeMillis());

        workflowMapper.update(existing);

        // Clear existing priority groups and jobs linkage
        List<WorkflowPriorityGroupVO> oldGroups = priorityGroupMapper.findByWorkflowId(request.getId());
        for (WorkflowPriorityGroupVO oldGroup : oldGroups) {
            // Unlink jobs from old priority group
            jobMapper.clearWorkflowInfo(oldGroup.getId());
        }
        priorityGroupMapper.deleteByWorkflowId(request.getId());

        // Recreate priority groups
        if (request.getPriorityGroups() != null) {
            for (WorkflowRequest.PriorityGroupRequest pgRequest : request.getPriorityGroups()) {
                String pgId = UUID.randomUUID().toString();

                WorkflowPriorityGroupVO priorityGroup = new WorkflowPriorityGroupVO();
                priorityGroup.setId(pgId);
                priorityGroup.setWorkflowId(request.getId());
                priorityGroup.setPriority(pgRequest.getPriority());
                priorityGroup.setIgnoreResult(pgRequest.getIgnoreResult() != null ? pgRequest.getIgnoreResult() : false);

                priorityGroupMapper.insert(priorityGroup);

                // Link jobs to priority group
                if (pgRequest.getJobs() != null) {
                    for (WorkflowRequest.JobInGroupRequest jobRequest : pgRequest.getJobs()) {
                        jobMapper.updateWorkflowInfo(
                                jobRequest.getJobId(),
                                request.getId(),
                                pgId,
                                jobRequest.getWorkflowDelay()
                        );
                    }
                }
            }
        }

        // Update Quartz schedule
        if (existing.getRepeatInterval() != null && !existing.getRepeatInterval().isEmpty()) {
            schedulerService.scheduleWorkflowWithRRule(existing);
            log.info("Rescheduled workflow with Quartz: {}", existing.getId());
        } else {
            schedulerService.unscheduleWorkflow(existing.getId());
            log.info("Unscheduled workflow from Quartz: {}", existing.getId());
        }

        return detail(request.getId());
    }

    @Transactional
    public ApiResponse<Void> delete(String workflowId) {
        // Admin only
        if (!securityUtils.isAdmin()) {
            return ApiResponse.error("Access denied: Admin only");
        }
        WorkflowVO existing = workflowMapper.findById(workflowId);
        if (existing == null) {
            return ApiResponse.error("Workflow not found: " + workflowId);
        }

        // Unschedule from Quartz first
        schedulerService.unscheduleWorkflow(workflowId);

        // Clear jobs linkage
        List<WorkflowPriorityGroupVO> groups = priorityGroupMapper.findByWorkflowId(workflowId);
        for (WorkflowPriorityGroupVO group : groups) {
            jobMapper.clearWorkflowInfo(group.getId());
        }

        // Delete priority groups
        priorityGroupMapper.deleteByWorkflowId(workflowId);

        // Delete workflow runs
        workflowRunMapper.deleteByWorkflowId(workflowId);

        // Delete workflow
        workflowMapper.delete(workflowId);

        return ApiResponse.success(null);
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<WorkflowRunResponse>> filterRuns(WorkflowRunFilterRequest request) {
        int offset = (request.getPage() - 1) * request.getPageSize();

        List<WorkflowRunVO> runs = workflowRunMapper.findByFilters(
                request.getWorkflowId(),
                request.getStatus(),
                request.getStartDateFrom(),
                request.getStartDateTo(),
                request.getPageSize(),
                offset
        );

        int total = (int) workflowRunMapper.countByFilters(
                request.getWorkflowId(),
                request.getStatus(),
                request.getStartDateFrom(),
                request.getStartDateTo()
        );

        List<WorkflowRunResponse> responses = runs.stream()
                .map(WorkflowRunResponse::from)
                .collect(Collectors.toList());

        return ApiResponse.successWithTotal(responses, total);
    }

    @Transactional(readOnly = true)
    public ApiResponse<WorkflowRunResponse> runDetail(String runId) {
        WorkflowRunVO run = workflowRunMapper.findById(Long.parseLong(runId));
        if (run == null) {
            return ApiResponse.error("Workflow run not found: " + runId);
        }

        WorkflowRunResponse response = WorkflowRunResponse.from(run);

        // Get job run details from job_run_log table
        List<JobRunLogVO> jobRunLogs = jobRunLogMapper.findByWorkflowRunId(Long.parseLong(runId));
        response.setJobRuns(jobRunLogs);

        return ApiResponse.success(response);
    }

    /**
     * Clean up stuck workflow runs that have been RUNNING for too long
     */
    @Transactional
    public ApiResponse<Integer> cleanupStuckRuns(long timeoutMs) {
        List<WorkflowRunVO> runningRuns = workflowRunMapper.findRunningWorkflows();
        long now = System.currentTimeMillis();
        int cleaned = 0;

        for (WorkflowRunVO run : runningRuns) {
            if (run.getStartDate() != null && (now - run.getStartDate()) > timeoutMs) {
                workflowRunMapper.updateStatus(
                        run.getWorkflowRunId(),
                        "FAILED",
                        now,
                        now - run.getStartDate(),
                        "Timed out - stuck in RUNNING state"
                );
                // Also reset the workflow status
                if (run.getWorkflowId() != null) {
                    workflowMapper.updateStatus(run.getWorkflowId(), "FAILED", now, null);
                }
                cleaned++;
                log.info("Cleaned up stuck workflow run: {} (started: {})", run.getWorkflowRunId(), run.getStartDate());
            }
        }

        return ApiResponse.success(cleaned);
    }
}
