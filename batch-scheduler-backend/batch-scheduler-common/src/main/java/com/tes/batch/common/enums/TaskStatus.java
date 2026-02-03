package com.tes.batch.common.enums;

/**
 * Status of a single task execution.
 */
public enum TaskStatus {
    /**
     * Task has been created but not yet started.
     */
    CREATED("created"),

    /**
     * Task is waiting in queue.
     */
    NONE("none"),

    /**
     * Task is currently running.
     */
    RUNNING("running"),

    /**
     * Task completed successfully.
     */
    SUCCESS("succeed"),

    /**
     * Task failed during execution.
     */
    FAILED("failed"),

    /**
     * Task was cancelled before completion.
     */
    CANCELLED("cancelled"),

    /**
     * Task was stopped manually.
     */
    STOPPED("stopped"),

    /**
     * Task was skipped (e.g., workflow condition).
     */
    SKIPPED("skipped"),

    /**
     * Task was revoked/terminated.
     */
    REVOKED("revoked"),

    /**
     * Task timed out.
     */
    TIMEOUT("timeout"),

    /**
     * Task failed but will be retried.
     */
    RETRY("retry");

    private final String value;

    TaskStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TaskStatus fromValue(String value) {
        for (TaskStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown task status: " + value);
    }
}
