package com.tes.batch.common.enums;

/**
 * Types of batch jobs supported by the scheduler.
 */
public enum JobType {
    /**
     * HTTP REST API call job.
     * Executes HTTP requests (GET, POST, PUT, DELETE).
     */
    REST_API,

    /**
     * Executable command job.
     * Executes shell commands or scripts on the target server.
     */
    EXECUTABLE
}
