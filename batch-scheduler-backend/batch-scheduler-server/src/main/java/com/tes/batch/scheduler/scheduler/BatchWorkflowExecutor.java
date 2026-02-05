package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import com.tes.batch.scheduler.workflow.WorkflowExecutionService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Quartz Job executor for workflow execution
 */
@Slf4j
@Component
public class BatchWorkflowExecutor implements Job {

    @Autowired
    private WorkflowMapper workflowMapper;

    @Autowired
    private WorkflowExecutionService workflowExecutionService;

    @Autowired
    private SchedulerService schedulerService;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        String workflowId = context.getJobDetail().getJobDataMap().getString("workflowId");
        log.info("Executing scheduled workflow: {}", workflowId);

        try {
            WorkflowVO workflow = workflowMapper.findById(workflowId);
            if (workflow == null) {
                log.warn("Workflow not found: {}", workflowId);
                return;
            }

            // Skip if workflow is already RUNNING (prevent concurrent executions)
            if ("RUNNING".equals(workflow.getLatestStatus())) {
                log.warn("Workflow {} is already RUNNING, skipping this execution", workflowId);
                // Don't reschedule here - handleWorkflowResult will reschedule when the workflow completes.
                // Rescheduling here causes duplicate triggers and rapid re-execution.
                return;
            }

            // Skip if next run time hasn't arrived yet (prevent premature execution)
            long now = System.currentTimeMillis();
            if (workflow.getNextRunDate() != null && now < workflow.getNextRunDate()) {
                long secondsUntilRun = (workflow.getNextRunDate() - now) / 1000;
                log.info("Workflow {} next run is in {} seconds, skipping premature execution",
                    workflowId, secondsUntilRun);
                // Reschedule for the correct time
                schedulerService.scheduleWorkflow(workflowId, workflow.getNextRunDate());
                return;
            }

            // Trigger workflow execution
            workflowExecutionService.executeWorkflow(workflowId);

            // NOTE: Rescheduling is handled in WorkflowExecutionService.handleWorkflowResult()
            // after the workflow completes, to prevent overlapping executions

        } catch (Exception e) {
            log.error("Error executing workflow: {}", workflowId, e);
            throw new JobExecutionException(e);
        }
    }
}
