package com.tes.batch.scheduler.domain.job.mapper;

import com.tes.batch.scheduler.domain.job.vo.JobVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

@Mapper
public interface JobMapper {

    JobVO findById(@Param("jobId") String jobId);

    JobVO findByIdWithRelations(@Param("jobId") String jobId);

    JobVO findByJobName(@Param("jobName") String jobName);

    boolean existsByJobName(@Param("jobName") String jobName);

    List<JobVO> findByWorkflowId(@Param("workflowId") String workflowId);

    List<JobVO> findByPriorityGroupId(@Param("priorityGroupId") String priorityGroupId);

    List<JobVO> findJobsToExecute(@Param("now") Long now);

    List<JobVO> findByFilters(
            @Param("jobId") String jobId,
            @Param("groupId") String groupId,
            @Param("systemId") String systemId,
            @Param("isEnabled") Boolean isEnabled,
            @Param("currentState") String currentState,
            @Param("textSearch") String textSearch,
            @Param("wfRegistered") Boolean wfRegistered,
            @Param("lastStartDateFrom") Long lastStartDateFrom,
            @Param("lastStartDateTo") Long lastStartDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(
            @Param("jobId") String jobId,
            @Param("groupId") String groupId,
            @Param("systemId") String systemId,
            @Param("isEnabled") Boolean isEnabled,
            @Param("currentState") String currentState,
            @Param("textSearch") String textSearch,
            @Param("wfRegistered") Boolean wfRegistered,
            @Param("lastStartDateFrom") Long lastStartDateFrom,
            @Param("lastStartDateTo") Long lastStartDateTo
    );

    List<JobVO> findByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("isEnabled") Boolean isEnabled,
            @Param("currentState") String currentState,
            @Param("textSearch") String textSearch,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("isEnabled") Boolean isEnabled,
            @Param("currentState") String currentState,
            @Param("textSearch") String textSearch
    );

    int insert(JobVO job);

    int update(JobVO job);

    int updateState(
            @Param("jobId") String jobId,
            @Param("currentState") String currentState,
            @Param("nextRunDate") Long nextRunDate
    );

    int updateRunStats(
            @Param("jobId") String jobId,
            @Param("lastStartDate") Long lastStartDate,
            @Param("runCount") Integer runCount,
            @Param("failureCount") Integer failureCount,
            @Param("retryCount") Integer retryCount
    );

    int delete(@Param("jobId") String jobId);

    int deleteByWorkflowId(@Param("workflowId") String workflowId);

    int updateWorkflowInfo(
            @Param("jobId") String jobId,
            @Param("workflowId") String workflowId,
            @Param("priorityGroupId") String priorityGroupId,
            @Param("workflowDelay") Integer workflowDelay
    );

    int clearWorkflowInfo(@Param("priorityGroupId") String priorityGroupId);
}
