package com.tes.batch.scheduler.domain.server.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.server.dto.ServerFilterRequest;
import com.tes.batch.scheduler.domain.server.dto.ServerRequest;
import com.tes.batch.scheduler.domain.server.service.ServerService;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/server")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;

    /**
     * Get servers with filter
     * POST /server/filter
     */
    @PostMapping("/filter")
    public ApiResponse<List<JobServerVO>> getServers(@RequestBody ServerFilterRequest request) {
        try {
            List<JobServerVO> servers = serverService.getServers(request);
            long total = serverService.countServers(request);
            return ApiResponse.success(servers, total);
        } catch (Exception e) {
            log.error("Failed to get servers", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get filter options (all servers for dropdown)
     * GET /server/getFilter
     */
    @GetMapping("/getFilter")
    public ApiResponse<List<JobServerVO>> getFilterOptions() {
        try {
            List<JobServerVO> servers = serverService.getAllServers();
            return ApiResponse.success(servers);
        } catch (Exception e) {
            log.error("Failed to get filter options", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Create server
     * POST /server/create
     */
    @PostMapping("/create")
    public ApiResponse<JobServerVO> createServer(@RequestBody ServerRequest request) {
        try {
            JobServerVO server = serverService.createServer(request);
            return ApiResponse.success(server);
        } catch (Exception e) {
            log.error("Failed to create server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update server
     * POST /server/update
     */
    @PostMapping("/update")
    public ApiResponse<JobServerVO> updateServer(@RequestBody ServerRequest request) {
        try {
            JobServerVO server = serverService.updateServer(request);
            return ApiResponse.success(server);
        } catch (Exception e) {
            log.error("Failed to update server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Delete server
     * DELETE /server/delete
     */
    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteServer(@RequestParam String systemId) {
        try {
            serverService.deleteServer(systemId);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to delete server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Restart server workers
     * POST /server/restart
     */
    @PostMapping("/restart")
    public ApiResponse<Void> restartServer(@RequestBody Map<String, Object> request) {
        try {
            String systemName = (String) request.get("system_name");
            Boolean redeploy = (Boolean) request.getOrDefault("redeploy", false);
            serverService.restartServer(systemName, redeploy);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to restart server", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
