package com.tes.batch.scheduler.domain.group.controller;

import com.tes.batch.common.dto.ApiResponse;
import com.tes.batch.scheduler.domain.group.dto.GroupFilterRequest;
import com.tes.batch.scheduler.domain.group.dto.GroupRequest;
import com.tes.batch.scheduler.domain.group.service.GroupService;
import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/group")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    /**
     * Get groups with filter
     * POST /group/filter
     */
    @PostMapping("/filter")
    public ApiResponse<List<JobGroupVO>> getGroups(@RequestBody GroupFilterRequest request) {
        try {
            List<JobGroupVO> groups = groupService.getGroups(request);
            long total = groupService.countGroups(request);
            return ApiResponse.success(groups, total);
        } catch (Exception e) {
            log.error("Failed to get groups", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Get filter options (all groups for dropdown)
     * GET /group/getFilter
     */
    @GetMapping("/getFilter")
    public ApiResponse<List<JobGroupVO>> getFilterOptions(
            @RequestParam(value = "page_size", defaultValue = "100") Integer pageSize,
            @RequestParam(value = "page_number", defaultValue = "1") Integer pageNumber,
            @RequestParam(value = "search_text", required = false) String searchText) {
        try {
            GroupFilterRequest request = new GroupFilterRequest();
            request.setSize(pageSize);
            request.setPage(pageNumber > 0 ? pageNumber - 1 : 0);
            request.setTextSearch(searchText);
            List<JobGroupVO> groups = groupService.getGroups(request);
            long total = groupService.countGroups(request);
            return ApiResponse.success(groups, total);
        } catch (Exception e) {
            log.error("Failed to get filter options", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Create group
     * POST /group/create
     */
    @PostMapping("/create")
    public ApiResponse<JobGroupVO> createGroup(@RequestBody GroupRequest request) {
        try {
            JobGroupVO group = groupService.createGroup(request);
            return ApiResponse.success(group);
        } catch (Exception e) {
            log.error("Failed to create group", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Update group
     * POST /group/update
     */
    @PostMapping("/update")
    public ApiResponse<JobGroupVO> updateGroup(@RequestBody GroupRequest request) {
        try {
            JobGroupVO group = groupService.updateGroup(request);
            return ApiResponse.success(group);
        } catch (Exception e) {
            log.error("Failed to update group", e);
            return ApiResponse.error(e.getMessage());
        }
    }

    /**
     * Delete group
     * DELETE /group/delete
     */
    @DeleteMapping("/delete")
    public ApiResponse<Void> deleteGroup(@RequestParam String groupId) {
        try {
            groupService.deleteGroup(groupId);
            return ApiResponse.success(null);
        } catch (Exception e) {
            log.error("Failed to delete group", e);
            return ApiResponse.error(e.getMessage());
        }
    }
}
