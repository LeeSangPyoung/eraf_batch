package com.tes.batch.testjob;

import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class BatchJobListener implements JobExecutionListener {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    @Override
    public void beforeJob(JobExecution jobExecution) {
        String timestamp = LocalDateTime.now().format(formatter);

        System.out.println();
        System.out.println("################################################################################");
        System.out.println("#                                                                              #");
        System.out.println("#                    BATCH TEST JOB - STARTING EXECUTION                       #");
        System.out.println("#                                                                              #");
        System.out.println("################################################################################");
        System.out.println();
        System.out.println("[" + timestamp + "] Job Name: " + jobExecution.getJobInstance().getJobName());
        System.out.println("[" + timestamp + "] Job Instance ID: " + jobExecution.getJobInstance().getInstanceId());
        System.out.println("[" + timestamp + "] Job Execution ID: " + jobExecution.getId());
        System.out.println("[" + timestamp + "] Status: " + jobExecution.getStatus());
        System.out.println();
        System.out.println("[" + timestamp + "] ============================================================");
        System.out.println("[" + timestamp + "] Starting 10-Step Batch Process...");
        System.out.println("[" + timestamp + "] ============================================================");
        System.out.println();
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        String timestamp = LocalDateTime.now().format(formatter);
        BatchStatus status = jobExecution.getStatus();

        System.out.println();
        System.out.println("[" + timestamp + "] ============================================================");
        System.out.println("[" + timestamp + "] All 10 Steps Completed!");
        System.out.println("[" + timestamp + "] ============================================================");
        System.out.println();

        if (status == BatchStatus.COMPLETED) {
            System.out.println("################################################################################");
            System.out.println("#                                                                              #");
            System.out.println("#                    BATCH TEST JOB - COMPLETED SUCCESSFULLY                   #");
            System.out.println("#                                                                              #");
            System.out.println("################################################################################");
        } else {
            System.out.println("################################################################################");
            System.out.println("#                                                                              #");
            System.out.println("#                    BATCH TEST JOB - FINISHED WITH STATUS: " + String.format("%-17s", status) + "#");
            System.out.println("#                                                                              #");
            System.out.println("################################################################################");
        }

        System.out.println();
        System.out.println("[" + timestamp + "] Final Status: " + status);
        System.out.println("[" + timestamp + "] Start Time: " + jobExecution.getStartTime());
        System.out.println("[" + timestamp + "] End Time: " + jobExecution.getEndTime());

        if (jobExecution.getStartTime() != null && jobExecution.getEndTime() != null) {
            long duration = java.time.Duration.between(
                    jobExecution.getStartTime(),
                    jobExecution.getEndTime()
            ).toMillis();
            System.out.println("[" + timestamp + "] Duration: " + duration + " ms (" + String.format("%.2f", duration / 1000.0) + " seconds)");
        }

        System.out.println();

        // Exit code
        if (status == BatchStatus.COMPLETED) {
            System.out.println("[" + timestamp + "] Exit Code: 0 (SUCCESS)");
        } else {
            System.out.println("[" + timestamp + "] Exit Code: 1 (FAILURE)");
        }
    }
}
