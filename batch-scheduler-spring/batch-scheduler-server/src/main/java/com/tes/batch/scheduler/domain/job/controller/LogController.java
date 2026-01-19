package com.tes.batch.scheduler.domain.job.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.job.dto.LogFilterRequest;
import com.tes.batch.scheduler.domain.job.service.LogService;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;

    /**
     * Get logs with filter
     * POST /logs/filter
     */
    @PostMapping("/filter")
    public ApiResponse<List<JobRunLogVO>> getLogs(@RequestBody LogFilterRequest request) {
        try {
            List<JobRunLogVO> logs = logService.getLogs(request);
            long total = logService.countLogs(request);
            return ApiResponse.success(logs, total);
        } catch (Exception e) {
            log.error("Failed to get logs", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get log detail
     * GET /logs/detail/{logId}
     */
    @GetMapping("/detail/{logId}")
    public ApiResponse<JobRunLogVO> getLogDetail(@PathVariable Long logId) {
        try {
            JobRunLogVO logVO = logService.getLog(logId);
            if (logVO == null) {
                return ApiResponse.error("Log not found: " + logId);
            }
            return ApiResponse.success(logVO);
        } catch (Exception e) {
            log.error("Failed to get log detail", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get logs by job ID
     * GET /logs/job/{jobId}
     */
    @GetMapping("/job/{jobId}")
    public ApiResponse<List<JobRunLogVO>> getLogsByJobId(@PathVariable String jobId) {
        try {
            List<JobRunLogVO> logs = logService.getLogsByJobId(jobId);
            return ApiResponse.success(logs);
        } catch (Exception e) {
            log.error("Failed to get logs by job ID", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
