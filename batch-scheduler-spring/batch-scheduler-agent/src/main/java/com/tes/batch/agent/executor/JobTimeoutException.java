package com.tes.batch.agent.executor;

/**
 * Exception thrown when a job execution exceeds its timeout
 */
public class JobTimeoutException extends RuntimeException {

    public JobTimeoutException(String message) {
        super(message);
    }

    public JobTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
