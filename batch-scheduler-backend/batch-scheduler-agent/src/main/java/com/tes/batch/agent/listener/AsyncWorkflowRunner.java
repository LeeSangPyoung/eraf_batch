package com.tes.batch.agent.listener;

import com.tes.batch.agent.config.ConcurrencyManager;
import com.tes.batch.agent.executor.WorkflowExecutor;
import com.tes.batch.common.dto.WorkflowMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Separate bean for async workflow execution to avoid Spring @Async self-invocation issue.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncWorkflowRunner {

    private final WorkflowExecutor workflowExecutor;
    private final ConcurrencyManager concurrencyManager;

    @Async("jobTaskExecutor")
    public void executeWorkflowAsync(WorkflowMessage workflowMessage) {
        try {
            concurrencyManager.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Workflow {} interrupted while waiting for concurrency permit", workflowMessage.getWorkflowId());
            return;
        }
        try {
            log.info("Starting workflow execution: {} (runId: {}, active: {}/{})",
                    workflowMessage.getWorkflowName(), workflowMessage.getWorkflowRunId(),
                    concurrencyManager.getActiveJobCount(),
                    concurrencyManager.getActiveJobCount() + concurrencyManager.getAvailablePermits());

            workflowExecutor.executeWorkflow(workflowMessage);
        } finally {
            concurrencyManager.release();
        }
    }
}
