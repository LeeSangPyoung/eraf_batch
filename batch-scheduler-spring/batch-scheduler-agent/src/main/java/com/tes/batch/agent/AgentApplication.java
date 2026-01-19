package com.tes.batch.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * TES Batch Scheduler Agent Application
 *
 * Lightweight agent deployed on remote servers for job execution.
 * Subscribes to Redis queue and executes assigned jobs.
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
