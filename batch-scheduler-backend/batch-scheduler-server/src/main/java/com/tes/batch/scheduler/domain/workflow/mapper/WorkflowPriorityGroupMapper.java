package com.tes.batch.scheduler.domain.workflow.mapper;

import com.tes.batch.scheduler.domain.workflow.vo.WorkflowPriorityGroupVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface WorkflowPriorityGroupMapper {

    WorkflowPriorityGroupVO findById(@Param("id") String id);

    List<WorkflowPriorityGroupVO> findByWorkflowId(@Param("workflowId") String workflowId);

    List<WorkflowPriorityGroupVO> findByWorkflowIdWithJobs(@Param("workflowId") String workflowId);

    int insert(WorkflowPriorityGroupVO priorityGroup);

    int update(WorkflowPriorityGroupVO priorityGroup);

    int updateStatus(
            @Param("id") String id,
            @Param("latestStatus") String latestStatus
    );

    int delete(@Param("id") String id);

    int deleteByWorkflowId(@Param("workflowId") String workflowId);

    // Priority Group - Job relation
    int insertPriorityGroupJob(
            @Param("priorityGroupId") String priorityGroupId,
            @Param("jobId") String jobId
    );

    int deletePriorityGroupJobs(@Param("priorityGroupId") String priorityGroupId);

    List<String> findJobIdsByPriorityGroupId(@Param("priorityGroupId") String priorityGroupId);
}
