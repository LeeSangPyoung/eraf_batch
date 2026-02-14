package com.tes.batch.agent.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Manages concurrent job execution limits using a Semaphore.
 * Prevents agent from being overloaded with too many simultaneous jobs.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConcurrencyManager {

    private final AgentConfig agentConfig;

    private Semaphore semaphore;
    private final AtomicInteger activeJobs = new AtomicInteger(0);

    @PostConstruct
    public void init() {
        int maxConcurrent = agentConfig.getExecutor().getMaxConcurrentJobs();
        this.semaphore = new Semaphore(maxConcurrent);
        log.info("ConcurrencyManager initialized: maxConcurrentJobs={}", maxConcurrent);
    }

    /**
     * Acquire a permit before job execution. Blocks if limit is reached.
     * @throws InterruptedException if the thread is interrupted while waiting
     */
    public void acquire() throws InterruptedException {
        semaphore.acquire();
        int active = activeJobs.incrementAndGet();
        log.debug("Job permit acquired. Active jobs: {}/{}", active, active + semaphore.availablePermits());
    }

    /**
     * Release a permit after job execution completes.
     * Must be called in a finally block. Safe to call even without matching acquire.
     */
    public void release() {
        // [H7] Guard against double-release or release without acquire
        int active = activeJobs.decrementAndGet();
        if (active < 0) {
            activeJobs.incrementAndGet(); // Undo the decrement
            log.warn("ConcurrencyManager.release() called without matching acquire - ignoring");
            return;
        }
        semaphore.release();
        log.debug("Job permit released. Active jobs: {}/{}", active, active + semaphore.availablePermits());
    }

    /**
     * Get current number of active (running) jobs
     */
    public int getActiveJobCount() {
        return activeJobs.get();
    }

    /**
     * Get number of available permits
     */
    public int getAvailablePermits() {
        return semaphore.availablePermits();
    }
}
