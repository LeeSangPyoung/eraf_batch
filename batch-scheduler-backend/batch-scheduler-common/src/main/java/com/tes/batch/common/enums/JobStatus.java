package com.tes.batch.common.enums;

/**
 * Status of a job definition in the scheduler.
 */
public enum JobStatus {
    /**
     * Job is scheduled and waiting for execution.
     */
    SCHEDULED,

    /**
     * Job is currently running.
     */
    RUNNING,

    /**
     * Job is paused and will not be executed.
     */
    PAUSED,

    /**
     * Job has completed all scheduled runs.
     */
    COMPLETED,

    /**
     * Job has been stopped manually.
     */
    STOPPED,

    /**
     * Job is in broken state due to failures.
     */
    BROKEN
}
