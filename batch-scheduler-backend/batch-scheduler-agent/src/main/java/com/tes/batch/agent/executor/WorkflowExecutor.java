package com.tes.batch.agent.executor;

import com.tes.batch.agent.state.TaskStateReporter;
import com.tes.batch.common.dto.JobMessage;
import com.tes.batch.common.dto.JobResult;
import com.tes.batch.common.dto.WorkflowMessage;
import com.tes.batch.common.enums.TaskStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

/**
 * Executes workflows with priority group-based DAG execution
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowExecutor {

    private final JobExecutor jobExecutor;
    private final TaskStateReporter stateReporter;
    private final ExecutorService jobExecutorService;

    /**
     * Execute a workflow
     * - Priority groups are executed sequentially (lowest priority first)
     * - Jobs within the same priority group are executed in parallel
     */
    public void executeWorkflow(WorkflowMessage workflowMessage) {
        log.info("Starting workflow execution: {} (runId: {})",
                workflowMessage.getWorkflowName(), workflowMessage.getWorkflowRunId());

        long startTime = System.currentTimeMillis();

        try {
            // Sort priority groups by priority (ascending)
            List<WorkflowMessage.PriorityGroup> sortedGroups =
                    workflowMessage.getPriorityGroups().stream()
                            .sorted(Comparator.comparing(WorkflowMessage.PriorityGroup::getPriority))
                            .toList();

            // Execute each priority group sequentially
            for (WorkflowMessage.PriorityGroup group : sortedGroups) {
                log.info("Executing priority group {} for workflow {}",
                        group.getPriority(), workflowMessage.getWorkflowName());

                boolean groupSuccess = executePriorityGroup(group, workflowMessage.getWorkflowRunId());

                // If group failed and ignoreResult is false, stop workflow
                if (!groupSuccess && !Boolean.TRUE.equals(group.getIgnoreResult())) {
                    log.error("Priority group {} failed, stopping workflow {}",
                            group.getPriority(), workflowMessage.getWorkflowName());

                    stateReporter.reportWorkflowResult(
                            workflowMessage.getWorkflowId(),
                            workflowMessage.getWorkflowRunId(),
                            TaskStatus.FAILED,
                            "Priority group " + group.getPriority() + " failed",
                            startTime,
                            System.currentTimeMillis()
                    );
                    return;
                }
            }

            // All groups completed successfully
            log.info("Workflow completed successfully: {}", workflowMessage.getWorkflowName());
            stateReporter.reportWorkflowResult(
                    workflowMessage.getWorkflowId(),
                    workflowMessage.getWorkflowRunId(),
                    TaskStatus.SUCCESS,
                    null,
                    startTime,
                    System.currentTimeMillis()
            );

        } catch (Exception e) {
            log.error("Workflow execution failed: {}", workflowMessage.getWorkflowName(), e);
            stateReporter.reportWorkflowResult(
                    workflowMessage.getWorkflowId(),
                    workflowMessage.getWorkflowRunId(),
                    TaskStatus.FAILED,
                    e.getMessage(),
                    startTime,
                    System.currentTimeMillis()
            );
        }
    }

    /**
     * Execute all jobs in a priority group in parallel
     */
    private boolean executePriorityGroup(WorkflowMessage.PriorityGroup group, Long workflowRunId) {
        List<CompletableFuture<JobResult>> futures = new ArrayList<>();

        for (JobMessage job : group.getJobs()) {
            CompletableFuture<JobResult> future = CompletableFuture.supplyAsync(() -> {
                try {
                    // Apply execution delay if specified
                    if (job.getExecutionDelay() != null && job.getExecutionDelay() > 0) {
                        log.info("Applying execution delay of {} seconds for job {}",
                                job.getExecutionDelay(), job.getJobId());
                        Thread.sleep(job.getExecutionDelay() * 1000L);
                    }

                    // Set workflow run ID if not already set
                    if (job.getWorkflowRunId() == null) {
                        job.setWorkflowRunId(workflowRunId);
                    }

                    // Generate task ID if not set
                    if (job.getTaskId() == null) {
                        job.setTaskId(generateTaskId(job.getJobId(), workflowRunId));
                    }

                    // Report job started
                    stateReporter.reportStarted(job.getJobId(), job.getTaskId());

                    // Execute job
                    JobResult result = jobExecutor.execute(job);

                    // Report result
                    stateReporter.reportResult(result);

                    return result;

                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return createFailedResult(job, workflowRunId, "Job interrupted: " + e.getMessage());
                } catch (Exception e) {
                    log.error("Job execution failed in workflow: {}", job.getJobId(), e);
                    JobResult failResult = createFailedResult(job, workflowRunId, e.getMessage());
                    stateReporter.reportResult(failResult);
                    return failResult;
                }
            }, jobExecutorService);

            futures.add(future);
        }

        // Wait for all jobs to complete
        List<JobResult> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        // Check if any job failed (excluding jobs that should be ignored)
        List<JobMessage> jobs = group.getJobs();
        boolean hasFailure = false;
        for (int i = 0; i < results.size(); i++) {
            JobResult result = results.get(i);
            JobMessage job = jobs.get(i);

            if ((result.getStatus() == TaskStatus.FAILED || result.getStatus() == TaskStatus.TIMEOUT)
                    && !Boolean.TRUE.equals(job.getIgnoreResult())) {
                hasFailure = true;
                break;
            }
        }

        if (hasFailure) {
            log.warn("Some jobs failed in priority group {}", group.getPriority());
        }

        return !hasFailure;
    }

    private String generateTaskId(String jobId, Long workflowRunId) {
        return "wf_" + workflowRunId + "_" + jobId + "_" + System.currentTimeMillis();
    }

    private JobResult createFailedResult(JobMessage job, Long workflowRunId, String error) {
        return JobResult.builder()
                .jobId(job.getJobId())
                .taskId(job.getTaskId() != null ? job.getTaskId() : generateTaskId(job.getJobId(), workflowRunId))
                .status(TaskStatus.FAILED)
                .error(error)
                .endTime(System.currentTimeMillis())
                .build();
    }
}
