package com.tes.batch.scheduler.domain.job.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.job.dto.JobFilterRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRunRequest;
import com.tes.batch.scheduler.domain.job.dto.JobStatusRequest;
import com.tes.batch.scheduler.domain.job.dto.RepeatIntervalSampleRequest;
import com.tes.batch.scheduler.domain.job.service.JobService;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import com.tes.batch.scheduler.scheduler.RRuleParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/job")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final RRuleParser rruleParser;

    /**
     * Get jobs with filter
     * POST /job/filter
     */
    @PostMapping("/filter")
    public ApiResponse<List<JobVO>> getJobs(@RequestBody JobFilterRequest request) {
        try {
            List<JobVO> jobs = jobService.getJobs(request);
            long total = jobService.countJobs(request);
            return ApiResponse.success(jobs, total);
        } catch (Exception e) {
            log.error("Failed to get jobs", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get filter options for jobs (used by dropdown selectors)
     * GET/POST /job/getFilter
     */
    @RequestMapping(value = "/getFilter", method = {RequestMethod.GET, RequestMethod.POST})
    public ApiResponse<List<JobVO>> getFilterOptions(@RequestBody(required = false) JobFilterRequest request) {
        try {
            if (request == null) {
                request = new JobFilterRequest();
            }
            if (request.getSize() == null) {
                request.setSize(100);
            }
            if (request.getPage() == null) {
                request.setPage(0);
            }
            List<JobVO> jobs = jobService.getJobs(request);
            long total = jobService.countJobs(request);

            // Get status list - actual values used in job run logs
            List<String> statusList = Arrays.asList(
                    "RUNNING", "SUCCESS", "FAILURE", "TIMEOUT", "REVOKED", "RETRY"
            );

            return ApiResponse.successWithStatusList(jobs, total, statusList);
        } catch (Exception e) {
            log.error("Failed to get job filter options", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get job detail
     * GET /job/detail
     */
    @GetMapping("/detail")
    public ApiResponse<JobVO> getJobDetail(@RequestParam("job_id") String jobId) {
        try {
            JobVO job = jobService.getJob(jobId);
            if (job == null) {
                return ApiResponse.error("Job not found: " + jobId);
            }
            return ApiResponse.success(job);
        } catch (Exception e) {
            log.error("Failed to get job detail", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Create job
     * POST /job/create
     */
    @PostMapping("/create")
    public ApiResponse<JobVO> createJob(@RequestBody JobRequest request) {
        log.info("Create job request: jobName={}, jobType={}, systemId={}, groupId={}",
                request.getJobName(), request.getJobType(), request.getSystemId(), request.getGroupId());
        try {
            JobVO job = jobService.createJob(request);
            return ApiResponse.success(job);
        } catch (Exception e) {
            log.error("Failed to create job", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update job
     * POST /job/update
     */
    @PostMapping("/update")
    public ApiResponse<JobVO> updateJob(@RequestBody JobRequest request) {
        try {
            JobVO job = jobService.updateJob(request);
            return ApiResponse.success(job);
        } catch (Exception e) {
            log.error("Failed to update job", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Delete job
     * DELETE /job/delete
     */
    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteJob(@RequestParam("job_id") String jobId) {
        try {
            jobService.deleteJob(jobId);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to delete job", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Manually run job
     * POST /job/manuallyRun
     */
    @PostMapping("/manuallyRun")
    public ApiResponse<JobRunLogVO> manuallyRunJob(@RequestBody JobRunRequest request) {
        try {
            JobRunLogVO runLog = jobService.manuallyRunJob(request.getJobId());
            return ApiResponse.success(runLog);
        } catch (Exception e) {
            log.error("Failed to manually run job", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Force stop job
     * POST /job/forceStop
     */
    @PostMapping("/forceStop")
    public ApiResponse<Void> forceStopJob(@RequestBody JobRunRequest request) {
        try {
            jobService.forceStopJob(request.getJobId());
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to force stop job", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update job status (enable/disable)
     * POST /job/updateJobStatus
     */
    @PostMapping("/updateJobStatus")
    public ApiResponse<Void> updateJobStatus(@RequestBody JobStatusRequest request) {
        try {
            jobService.updateJobStatus(request.getJobId(), request.getIsEnabled());
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to update job status", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get sample run times for repeat interval
     * POST /job/repeatIntervalSample
     */
    @PostMapping("/repeatIntervalSample")
    public ApiResponse<List<String>> getRepeatIntervalSample(@RequestBody RepeatIntervalSampleRequest request) {
        try {
            String rrule = request.getRepeatInterval();
            if (rrule == null || rrule.isEmpty()) {
                return ApiResponse.success(new ArrayList<>());
            }

            // Validate RRULE
            if (!rruleParser.isValidRRule(rrule)) {
                return ApiResponse.error("Invalid RRULE format");
            }

            // Parse timezone
            ZoneId zoneId = ZoneId.of(request.getTimezone() != null ? request.getTimezone() : "Asia/Seoul");

            // Parse start date
            ZonedDateTime startDateTime;
            if (request.getStartDate() != null) {
                startDateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(request.getStartDate()), zoneId);
            } else {
                startDateTime = ZonedDateTime.now(zoneId);
            }

            // Get next 12 occurrences
            List<String> samples = new ArrayList<>();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            ZonedDateTime current = startDateTime.minusSeconds(1); // Start from just before

            for (int i = 0; i < 12; i++) {
                ZonedDateTime next = rruleParser.getNextOccurrence(rrule, startDateTime, current);
                if (next == null) {
                    break;
                }
                samples.add(next.format(formatter));
                current = next;
            }

            return ApiResponse.success(samples);
        } catch (Exception e) {
            log.error("Failed to get repeat interval sample", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
