package com.tes.batch.scheduler;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * TES Batch Scheduler Server Application
 *
 * Main entry point for the Scheduler Server.
 * Provides REST API, Quartz scheduling, and Agent management.
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
@MapperScan("com.tes.batch.scheduler.domain.*.mapper")
public class SchedulerApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchedulerApplication.class, args);
    }
}
