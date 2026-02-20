package com.tes.batch.testjob;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

@Configuration
public class BatchJobConfig {

    private static final Logger log = LoggerFactory.getLogger(BatchJobConfig.class);
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final Random random = new Random();

    @Bean
    public Job testJob(JobRepository jobRepository,
                       BatchJobListener batchJobListener,
                       Step step1, Step step2, Step step3, Step step4, Step step5,
                       Step step6, Step step7, Step step8, Step step9, Step step10) {
        return new JobBuilder("testJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .listener(batchJobListener)
                .start(step1)
                .next(step2)
                .next(step3)
                .next(step4)
                .next(step5)
                .next(step6)
                .next(step7)
                .next(step8)
                .next(step9)
                .next(step10)
                .build();
    }

    @Bean
    public Step step1(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step1", jobRepository, transactionManager, "Data Initialization", 1);
    }

    @Bean
    public Step step2(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step2", jobRepository, transactionManager, "Database Connection", 2);
    }

    @Bean
    public Step step3(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step3", jobRepository, transactionManager, "Data Extraction", 3);
    }

    @Bean
    public Step step4(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step4", jobRepository, transactionManager, "Data Validation", 4);
    }

    @Bean
    public Step step5(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step5", jobRepository, transactionManager, "Data Transformation", 5);
    }

    @Bean
    public Step step6(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step6", jobRepository, transactionManager, "Business Logic Processing", 6);
    }

    @Bean
    public Step step7(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step7", jobRepository, transactionManager, "Data Aggregation", 7);
    }

    @Bean
    public Step step8(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step8", jobRepository, transactionManager, "Report Generation", 8);
    }

    @Bean
    public Step step9(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step9", jobRepository, transactionManager, "Data Export", 9);
    }

    @Bean
    public Step step10(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return createStep("step10", jobRepository, transactionManager, "Cleanup & Finalization", 10);
    }

    private Step createStep(String stepName, JobRepository jobRepository,
                            PlatformTransactionManager transactionManager,
                            String description, int stepNumber) {
        return new StepBuilder(stepName, jobRepository)
                .tasklet(createTasklet(stepName, description, stepNumber), transactionManager)
                .build();
    }

    private Tasklet createTasklet(String stepName, String description, int stepNumber) {
        return (contribution, chunkContext) -> {
            String timestamp = LocalDateTime.now().format(formatter);

            // Step 시작
            System.out.println("================================================================================");
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "/10] Starting: " + description);
            System.out.println("================================================================================");

            // 다양한 로그 출력
            int logCount = 5 + random.nextInt(10); // 5~14개의 로그

            for (int i = 1; i <= logCount; i++) {
                Thread.sleep(200 + random.nextInt(300)); // 200~500ms 대기
                timestamp = LocalDateTime.now().format(formatter);

                String logMessage = generateLogMessage(stepNumber, description, i, logCount);
                System.out.println("[" + timestamp + "] [STEP " + stepNumber + "] " + logMessage);
            }

            // 처리 결과 출력
            int processedCount = 100 + random.nextInt(900);
            int successCount = processedCount - random.nextInt(10);
            int failedCount = processedCount - successCount;

            timestamp = LocalDateTime.now().format(formatter);
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "] ----------------------------------------");
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "] Processing Summary:");
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "]   - Total Records: " + processedCount);
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "]   - Success: " + successCount);
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "]   - Failed: " + failedCount);
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "]   - Success Rate: " + String.format("%.2f", (successCount * 100.0 / processedCount)) + "%");
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "] ----------------------------------------");

            // Step 완료
            Thread.sleep(300);
            timestamp = LocalDateTime.now().format(formatter);
            System.out.println("[" + timestamp + "] [STEP " + stepNumber + "/10] Completed: " + description + " [OK]");
            System.out.println();

            return RepeatStatus.FINISHED;
        };
    }

    private String generateLogMessage(int stepNumber, String description, int iteration, int total) {
        String[] actions = {
                "Processing record batch",
                "Validating data integrity",
                "Executing business rule",
                "Updating status",
                "Writing to buffer",
                "Checking constraints",
                "Applying transformation",
                "Calculating metrics",
                "Synchronizing data",
                "Verifying checksum"
        };

        String action = actions[random.nextInt(actions.length)];
        int progress = (iteration * 100) / total;

        return String.format("%s... [%d/%d] (%d%% complete)", action, iteration, total, progress);
    }
}
