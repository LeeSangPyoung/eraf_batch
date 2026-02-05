package com.tes.batch.scheduler.domain.server.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.common.enums.DeploymentType;
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
     * Delete server (with proper deployment cleanup)
     * DELETE /server/delete
     */
    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteServer(@RequestParam String systemId) {
        try {
            serverService.deleteServerWithCleanup(systemId);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to delete server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Stop server worker
     * POST /server/stop
     */
    @PostMapping("/stop")
    public ApiResponse<Void> stopServer(@RequestBody Map<String, Object> request) {
        try {
            String systemName = (String) request.get("system_name");
            serverService.stopServer(systemName);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to stop server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Start server worker
     * POST /server/start
     */
    @PostMapping("/start")
    public ApiResponse<Void> startServer(@RequestBody Map<String, Object> request) {
        try {
            String systemName = (String) request.get("system_name");
            serverService.startServer(systemName);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to start server", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Redeploy server worker (supports deployment type transition)
     * POST /server/redeploy
     * @param request { system_name: string, previous_deployment_type?: "JAR" | "DOCKER" }
     */
    @PostMapping("/redeploy")
    public ApiResponse<Void> redeployServer(@RequestBody Map<String, Object> request) {
        try {
            String systemName = (String) request.get("system_name");
            String previousTypeStr = (String) request.get("previous_deployment_type");

            DeploymentType previousType = null;
            if (previousTypeStr != null && !previousTypeStr.isEmpty()) {
                try {
                    previousType = DeploymentType.valueOf(previousTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid previous_deployment_type: {}", previousTypeStr);
                }
            }

            serverService.redeployServer(systemName, previousType);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to redeploy server", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
