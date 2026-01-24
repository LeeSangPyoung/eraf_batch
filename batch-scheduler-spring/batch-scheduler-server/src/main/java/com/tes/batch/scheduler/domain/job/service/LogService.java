package com.tes.batch.scheduler.domain.job.service;

import com.tes.batch.scheduler.domain.job.dto.LogFilterRequest;
import com.tes.batch.scheduler.domain.job.mapper.JobRunLogMapper;
import com.tes.batch.scheduler.domain.job.vo.JobRunLogVO;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class LogService {

    private final JobRunLogMapper logMapper;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<JobRunLogVO> getLogs(LogFilterRequest request) {
        // Frontend uses 1-indexed page_number
        int page = request.getPage() > 0 ? request.getPage() - 1 : 0;
        int offset = page * request.getSize();

        if (securityUtils.isAdmin()) {
            return logMapper.findByFilters(
                    request.getJobId(),
                    request.getStatus(),
                    request.getReqStartDateFrom(),
                    request.getReqStartDateTo(),
                    request.getSize(),
                    offset
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return List.of();
            }
            return logMapper.findByFiltersAndGroupIds(
                    groupIds,
                    request.getJobId(),
                    request.getStatus(),
                    request.getReqStartDateFrom(),
                    request.getReqStartDateTo(),
                    request.getSize(),
                    offset
            );
        }
    }

    @Transactional(readOnly = true)
    public long countLogs(LogFilterRequest request) {
        if (securityUtils.isAdmin()) {
            return logMapper.countByFilters(
                    request.getJobId(),
                    request.getStatus(),
                    request.getReqStartDateFrom(),
                    request.getReqStartDateTo()
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return 0;
            }
            return logMapper.countByFiltersAndGroupIds(
                    groupIds,
                    request.getJobId(),
                    request.getStatus(),
                    request.getReqStartDateFrom(),
                    request.getReqStartDateTo()
            );
        }
    }

    @Transactional(readOnly = true)
    public JobRunLogVO getLog(Long logId) {
        return logMapper.findById(logId);
    }

    @Transactional(readOnly = true)
    public List<JobRunLogVO> getLogsByJobId(String jobId) {
        return logMapper.findByJobId(jobId);
    }
}
