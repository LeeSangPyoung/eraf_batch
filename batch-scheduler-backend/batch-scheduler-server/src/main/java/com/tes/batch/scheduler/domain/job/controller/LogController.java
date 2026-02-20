package com.tes.batch.scheduler.domain.job.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.job.dto.LogFilterRequest;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.service.LogService;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;
    private final JobRunLogMapper logMapper;

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

    /**
     * Dashboard summary API - returns pre-aggregated data instead of raw logs.
     * POST /logs/dashboard
     */
    @PostMapping("/dashboard")
    public ApiResponse<Map<String, Object>> getDashboardSummary(@RequestBody Map<String, Long> request) {
        try {
            Long from = request.get("from");
            Long to = request.get("to");
            if (from == null || to == null) {
                return ApiResponse.error("from and to are required");
            }

            // Calculate today's range (Asia/Seoul timezone)
            java.time.ZoneId seoulZone = java.time.ZoneId.of("Asia/Seoul");
            java.time.ZonedDateTime now = java.time.ZonedDateTime.now(seoulZone);
            long todayStart = now.toLocalDate().atStartOfDay(seoulZone).toInstant().toEpochMilli();
            long todayEnd = now.toLocalDate().plusDays(1).atStartOfDay(seoulZone).toInstant().toEpochMilli() - 1;

            Map<String, Object> result = new HashMap<>();

            // Daily aggregation for chart (full date range)
            result.put("daily", logMapper.aggregateByDay(from, to));

            // Hourly aggregation for today only
            result.put("hourly", logMapper.aggregateByHour(todayStart, todayEnd));

            // Status distribution for pie chart (full date range)
            result.put("statusDistribution", logMapper.aggregateByStatus(from, to));

            // Today's status distribution (for summary cards)
            result.put("todayStats", logMapper.aggregateByStatus(todayStart, todayEnd));

            // Recent failed logs (top 5)
            result.put("recentFailed", logMapper.findRecentByStatuses(
                    List.of("FAILED", "FAILURE", "BROKEN", "TIMEOUT"), from, to, 5));

            // Currently running logs (top 5)
            result.put("recentRunning", logMapper.findRecentByStatuses(
                    List.of("RUNNING"), from, to, 5));

            return ApiResponse.success(result);
        } catch (Exception e) {
            log.error("Failed to get dashboard summary", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
