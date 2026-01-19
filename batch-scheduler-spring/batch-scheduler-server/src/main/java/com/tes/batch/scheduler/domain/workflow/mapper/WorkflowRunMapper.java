package com.tes.batch.scheduler.domain.workflow.mapper;

import com.tes.batch.scheduler.domain.workflow.vo.WorkflowRunVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface WorkflowRunMapper {

    WorkflowRunVO findById(@Param("workflowRunId") Long workflowRunId);

    List<WorkflowRunVO> findByWorkflowId(@Param("workflowId") String workflowId);

    WorkflowRunVO findLatestByWorkflowId(@Param("workflowId") String workflowId);

    List<WorkflowRunVO> findByFilters(
            @Param("workflowId") String workflowId,
            @Param("status") String status,
            @Param("startDateFrom") Long startDateFrom,
            @Param("startDateTo") Long startDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(
            @Param("workflowId") String workflowId,
            @Param("status") String status,
            @Param("startDateFrom") Long startDateFrom,
            @Param("startDateTo") Long startDateTo
    );

    List<WorkflowRunVO> findRunningWorkflows();

    int insert(WorkflowRunVO workflowRun);

    int updateStatus(
            @Param("workflowRunId") Long workflowRunId,
            @Param("status") String status,
            @Param("endDate") Long endDate,
            @Param("durationMs") Long durationMs,
            @Param("errorMessage") String errorMessage
    );

    int updateJobCounts(
            @Param("workflowRunId") Long workflowRunId,
            @Param("completedJobs") Integer completedJobs,
            @Param("failedJobs") Integer failedJobs
    );

    int delete(@Param("workflowRunId") Long workflowRunId);

    int deleteByWorkflowId(@Param("workflowId") String workflowId);
}
