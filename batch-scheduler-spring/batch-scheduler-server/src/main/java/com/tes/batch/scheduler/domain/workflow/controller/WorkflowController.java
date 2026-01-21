package com.tes.batch.scheduler.domain.workflow.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.workflow.dto.*;
import com.tes.batch.scheduler.domain.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping("/filter")
    public ApiResponse<List<WorkflowResponse>> filter(@RequestBody WorkflowFilterRequest request) {
        return workflowService.filter(request);
    }

    /**
     * Get filter options (workflows for dropdown)
     * GET /workflow/getFilter
     */
    @GetMapping("/getFilter")
    public ApiResponse<List<WorkflowResponse>> getFilterOptions(
            @RequestParam(value = "page_size", defaultValue = "100") Integer pageSize,
            @RequestParam(value = "page_number", defaultValue = "1") Integer pageNumber,
            @RequestParam(value = "search_text", required = false) String searchText) {
        WorkflowFilterRequest request = new WorkflowFilterRequest();
        request.setPageSize(pageSize);
        request.setPage(pageNumber);
        request.setWorkflowName(searchText);
        return workflowService.filter(request);
    }

    @PostMapping("/detail")
    public ApiResponse<WorkflowResponse> detail(@RequestBody Map<String, String> request) {
        String workflowId = request.get("id");
        if (workflowId == null) {
            workflowId = request.get("workflow_id");
        }
        return workflowService.detail(workflowId);
    }

    @PostMapping("/create")
    public ApiResponse<WorkflowResponse> create(@RequestBody WorkflowRequest request) {
        return workflowService.create(request);
    }

    @PostMapping("/update")
    public ApiResponse<WorkflowResponse> update(@RequestBody WorkflowRequest request) {
        return workflowService.update(request);
    }

    @PostMapping("/delete")
    public ApiResponse<Void> delete(@RequestBody Map<String, String> request) {
        String workflowId = request.get("id");
        if (workflowId == null) {
            workflowId = request.get("workflow_id");
        }
        return workflowService.delete(workflowId);
    }

    @PostMapping("/run/filter")
    public ApiResponse<List<WorkflowRunResponse>> filterRuns(@RequestBody WorkflowRunFilterRequest request) {
        return workflowService.filterRuns(request);
    }

    @GetMapping("/run/detail/{runId}")
    public ApiResponse<WorkflowRunResponse> runDetail(@PathVariable String runId) {
        return workflowService.runDetail(runId);
    }
}
