package com.tes.batch.scheduler.domain.job.mapper;

import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

@Mapper
public interface JobRunLogMapper {

    JobRunLogVO findById(@Param("logId") Long logId);

    List<JobRunLogVO> findByJobId(@Param("jobId") String jobId);

    JobRunLogVO findLatestByJobId(@Param("jobId") String jobId);

    List<JobRunLogVO> findByWorkflowRunId(@Param("workflowRunId") Long workflowRunId);

    List<JobRunLogVO> findByFilters(
            @Param("jobId") String jobId,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(
            @Param("jobId") String jobId,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo
    );

    List<JobRunLogVO> findByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo
    );

    long countByJobIdAndStatus(
            @Param("jobId") String jobId,
            @Param("status") String status
    );

    int insert(JobRunLogVO log);

    int updateStatus(
            @Param("logId") Long logId,
            @Param("status") String status,
            @Param("operation") String operation,
            @Param("actualEndDate") Long actualEndDate,
            @Param("runDuration") String runDuration,
            @Param("errors") String errors,
            @Param("errorNo") Integer errorNo,
            @Param("output") String output
    );

    int delete(@Param("logId") Long logId);

    int deleteByJobId(@Param("jobId") String jobId);
}
