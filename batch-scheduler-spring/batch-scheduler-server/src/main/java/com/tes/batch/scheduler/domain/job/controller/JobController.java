package com.tes.batch.scheduler.domain.job.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.job.dto.JobFilterRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRequest;
import com.tes.batch.scheduler.domain.job.dto.JobRunRequest;
import com.tes.batch.scheduler.domain.job.service.JobService;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.domain.job.vo.JobVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/job")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

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
}
