package com.tes.batch.scheduler.domain.job.mapper;

import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Mapper
public interface JobRunLogMapper {

    JobRunLogVO findById(@Param("logId") Long logId);

    List<JobRunLogVO> findByJobId(@Param("jobId") String jobId);

    JobRunLogVO findLatestByJobId(@Param("jobId") String jobId);

    List<JobRunLogVO> findByWorkflowRunId(@Param("workflowRunId") Long workflowRunId);

    List<JobRunLogVO> findByFilters(
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("groupId") String groupId,
            @Param("operation") String operation,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("groupId") String groupId,
            @Param("operation") String operation,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo
    );

    List<JobRunLogVO> findByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("operation") String operation,
            @Param("status") String status,
            @Param("reqStartDateFrom") Long reqStartDateFrom,
            @Param("reqStartDateTo") Long reqStartDateTo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFiltersAndGroupIds(
            @Param("groupIds") Set<String> groupIds,
            @Param("jobId") String jobId,
            @Param("systemId") String systemId,
            @Param("operation") String operation,
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
            @Param("actualStartDate") Long actualStartDate,
            @Param("actualEndDate") Long actualEndDate,
            @Param("runDuration") String runDuration,
            @Param("errors") String errors,
            @Param("errorNo") Integer errorNo,
            @Param("output") String output
    );

    int updateStatusWithJobName(
            @Param("logId") Long logId,
            @Param("jobName") String jobName,
            @Param("status") String status,
            @Param("operation") String operation,
            @Param("actualStartDate") Long actualStartDate,
            @Param("actualEndDate") Long actualEndDate,
            @Param("runDuration") String runDuration,
            @Param("errors") String errors,
            @Param("errorNo") Integer errorNo,
            @Param("output") String output
    );

    int updateRetryStatus(
            @Param("logId") Long logId,
            @Param("status") String status,
            @Param("operation") String operation,
            @Param("retryAttempt") Integer retryAttempt,
            @Param("actualStartDate") Long actualStartDate,
            @Param("actualEndDate") Long actualEndDate,
            @Param("runDuration") String runDuration,
            @Param("errors") String errors,
            @Param("errorNo") Integer errorNo,
            @Param("output") String output
    );

    int delete(@Param("logId") Long logId);

    int deleteByJobId(@Param("jobId") String jobId);

    int markOrphanedLogsAsBroken(@Param("endDate") Long endDate);

    /**
     * Find job IDs of orphaned logs (RUNNING/WAITING older than cutoff)
     */
    List<String> findOrphanedJobIds(@Param("endDate") Long endDate);

    /**
     * Mark all RUNNING jobs for a specific server as BROKEN when agent goes offline
     */
    int markRunningJobsAsBrokenBySystemId(
            @Param("systemId") String systemId,
            @Param("endDate") Long endDate,
            @Param("errors") String errors
    );

    /**
     * Find log by task ID for real-time log streaming
     */
    JobRunLogVO selectByTaskId(@Param("taskId") String taskId);

    /**
     * Count recent agent-related failures for a specific server
     */
    int countRecentAgentFailuresBySystemId(
            @Param("systemId") String systemId,
            @Param("sinceTimestamp") Long sinceTimestamp
    );

    /**
     * Find most recent agent-related failure timestamp for a specific server
     */
    Long findLatestAgentFailureTimeBySystemId(@Param("systemId") String systemId);

    /**
     * [P1] Batch: count recent agent failures for multiple servers in one query
     */
    List<Map<String, Object>> batchCountRecentAgentFailures(
            @Param("systemIds") List<String> systemIds,
            @Param("sinceTimestamp") Long sinceTimestamp
    );

    /**
     * [P1] Batch: find latest agent failure time for multiple servers in one query
     */
    List<Map<String, Object>> batchFindLatestAgentFailureTime(
            @Param("systemIds") List<String> systemIds
    );

    /**
     * Dashboard: aggregate log counts by day within date range
     */
    List<Map<String, Object>> aggregateByDay(
            @Param("from") Long from,
            @Param("to") Long to
    );

    /**
     * Dashboard: aggregate log counts by hour for today
     */
    List<Map<String, Object>> aggregateByHour(
            @Param("dayStart") Long dayStart,
            @Param("dayEnd") Long dayEnd
    );

    /**
     * Dashboard: get recent failed/running logs (limited)
     */
    List<JobRunLogVO> findRecentByStatuses(
            @Param("statuses") List<String> statuses,
            @Param("from") Long from,
            @Param("to") Long to,
            @Param("limit") int limit
    );

    /**
     * Dashboard: status distribution for pie chart
     */
    List<Map<String, Object>> aggregateByStatus(
            @Param("from") Long from,
            @Param("to") Long to
    );
}
