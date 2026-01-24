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

            // Trigger workflow execution
            workflowExecutionService.executeWorkflow(workflowId);

            // Reschedule for next run
            Long nextRunDate = schedulerService.calculateNextRunDate(workflow);
            if (nextRunDate != null) {
                workflowMapper.updateNextRunDate(workflowId, nextRunDate);
                schedulerService.scheduleWorkflow(workflowId, nextRunDate);
                log.info("Rescheduled workflow {} for next run at {}", workflowId, nextRunDate);
            } else {
                log.info("No more runs scheduled for workflow {}", workflowId);
            }

        } catch (Exception e) {
            log.error("Error executing workflow: {}", workflowId, e);
            throw new JobExecutionException(e);
        }
    }
}
