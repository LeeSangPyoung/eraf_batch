package com.tes.batch.scheduler.domain.workflow.mapper;

import com.tes.batch.scheduler.domain.workflow.vo.WorkflowVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

@Mapper
public interface WorkflowMapper {

    WorkflowVO findById(@Param("id") String id);

    WorkflowVO findByIdWithRelations(@Param("id") String id);

    WorkflowVO findByWorkflowName(@Param("workflowName") String workflowName);

    WorkflowVO findByName(@Param("workflowName") String workflowName);

    boolean existsByWorkflowName(@Param("workflowName") String workflowName);

    List<WorkflowVO> findWorkflowsToExecute(@Param("now") Long now);

    List<WorkflowVO> findByFilters(
            @Param("workflowName") String workflowName,
            @Param("groupId") String groupId,
            @Param("latestStatus") String latestStatus,
            @Param("textSearch") String textSearch,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(
            @Param("workflowName") String workflowName,
            @Param("groupId") String groupId,
            @Param("latestStatus") String latestStatus,
            @Param("textSearch") String textSearch
    );

    List<WorkflowVO> findByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("workflowName") String workflowName,
            @Param("latestStatus") String latestStatus,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("workflowName") String workflowName,
            @Param("latestStatus") String latestStatus
    );

    int insert(WorkflowVO workflow);

    int update(WorkflowVO workflow);

    int updateStatus(
            @Param("id") String id,
            @Param("latestStatus") String latestStatus,
            @Param("lastRunDate") Long lastRunDate,
            @Param("nextRunDate") Long nextRunDate
    );

    int delete(@Param("id") String id);
}
