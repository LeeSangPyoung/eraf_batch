package com.tes.batch.scheduler.scheduler;

import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowMapper;
import com.tes.batch.scheduler.domain.workflow.mapper.WorkflowRunMapper;
import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Scheduler that periodically checks for timed-out jobs and workflows.
 * This handles cases where Agent fails to send results due to crashes or network issues.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TimeoutCheckScheduler {

    private final JobMapper jobMapper;
    private final JobRunLogMapper jobRunLogMapper;
    private final WorkflowRunMapper workflowRunMapper;
    private final WorkflowMapper workflowMapper;

    /**
     * Check for timed-out jobs every 1 minute
     */
    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    @Transactional
    public void checkTimeouts() {
        log.debug("Checking for timed-out jobs and workflows...");

        long now = System.currentTimeMillis();
        int timeoutCount = 0;

        // Check job run logs that are RUNNING or PENDING
        List<JobRunLogVO> runningLogs = jobRunLogMapper.findByFilters(
                null, null, null, null, "RUNNING",
                null, null, 1000, 0
        );

        for (JobRunLogVO runLog : runningLogs) {
            if (isLogTimedOut(runLog, now)) {
                log.warn("Job run log {} timed out (job: {}, started: {})",
                        runLog.getLogId(), runLog.getJobId(), runLog.getReqStartDate());

                jobRunLogMapper.updateStatus(
                        runLog.getLogId(),
                        "TIMEOUT",
                        "BROKEN",
                        runLog.getActualStartDate(),
                        now,
                        formatDuration(now - (runLog.getActualStartDate() != null ? runLog.getActualStartDate() : runLog.getReqStartDate())),
                        "Job exceeded maximum run duration",
                        null,
                        null
                );

                // Update job state to BROKEN
                jobMapper.updateState(runLog.getJobId(), "BROKEN", null);
                timeoutCount++;
            }
        }

        // Check workflow runs that are RUNNING
        List<WorkflowRunVO> runningWorkflows = workflowRunMapper.findRunningWorkflows();

        for (WorkflowRunVO run : runningWorkflows) {
            // Workflow timeout: 24 hours (configurable)
            long workflowMaxDuration = 24 * 60 * 60 * 1000L; // 24 hours
            if (run.getStartDate() != null && (now - run.getStartDate()) > workflowMaxDuration) {
                log.warn("Workflow run {} timed out (workflow: {}, started: {})",
                        run.getWorkflowRunId(), run.getWorkflowId(), run.getStartDate());

                workflowRunMapper.updateStatus(
                        run.getWorkflowRunId(),
                        "TIMEOUT",
                        now,
                        now - run.getStartDate(),
                        "Workflow exceeded maximum run duration (24 hours)"
                );

                workflowMapper.updateStatus(run.getWorkflowId(), "TIMEOUT", now, null);
                timeoutCount++;
            }
        }

        if (timeoutCount > 0) {
            log.info("Marked {} jobs/workflows as timed out", timeoutCount);
        }
    }

    /**
     * Check if a job run log has timed out based on max_run_duration
     */
    private boolean isLogTimedOut(JobRunLogVO runLog, long now) {
        // Get job to check max_run_duration
        JobVO job = jobMapper.findById(runLog.getJobId());
        if (job == null) {
            return false;
        }

        // Parse max run duration (default 1 hour if not set)
        long maxDurationMs = parseDurationToMillis(job.getMaxRunDuration());
        if (maxDurationMs == 0) {
            maxDurationMs = 3600000L; // 1 hour default
        }

        // Check if elapsed time exceeds max duration
        Long startTime = runLog.getActualStartDate() != null ? runLog.getActualStartDate() : runLog.getReqStartDate();
        if (startTime == null) {
            return false;
        }

        long elapsedMs = now - startTime;
        return elapsedMs > maxDurationMs;
    }

    /**
     * Parse duration string (HH:MM:SS) to milliseconds
     */
    private long parseDurationToMillis(String duration) {
        if (duration == null || duration.isEmpty()) {
            return 0;
        }

        try {
            String[] parts = duration.split(":");
            if (parts.length == 3) {
                long hours = Long.parseLong(parts[0]);
                long minutes = Long.parseLong(parts[1]);
                long seconds = Long.parseLong(parts[2]);
                return (hours * 3600 + minutes * 60 + seconds) * 1000;
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid duration format: {}", duration);
        }

        return 0;
    }

    /**
     * Format duration in milliseconds to HH:MM:SS
     */
    private String formatDuration(long durationMs) {
        long seconds = durationMs / 1000;
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }
}
