package com.tes.batch.scheduler.domain.group.service;

import com.tes.batch.scheduler.domain.group.dto.GroupFilterRequest;
import com.tes.batch.scheduler.domain.group.dto.GroupRequest;
import com.tes.batch.scheduler.domain.group.mapper.JobGroupMapper;
import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import com.tes.batch.scheduler.domain.job.mapper.JobMapper;
import com.tes.batch.scheduler.domain.user.mapper.UserMapper;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

    private final JobGroupMapper groupMapper;
    private final JobMapper jobMapper;
    private final UserMapper userMapper;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<JobGroupVO> getGroups(GroupFilterRequest request) {
        int offset = request.getPage() * request.getSize();

        if (securityUtils.isAdmin()) {
            return groupMapper.findByFilters(
                    request.getTextSearch(),
                    request.getSize(),
                    offset
            );
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return List.of();
            }
            return groupMapper.findByGroupIdInWithPaging(groupIds, request.getSize(), offset);
        }
    }

    @Transactional(readOnly = true)
    public long countGroups(GroupFilterRequest request) {
        if (securityUtils.isAdmin()) {
            return groupMapper.countByFilters(request.getTextSearch());
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return 0;
            }
            return groupMapper.countByGroupIdIn(groupIds);
        }
    }

    @Transactional(readOnly = true)
    public List<JobGroupVO> getAllGroups() {
        if (securityUtils.isAdmin()) {
            return groupMapper.findAll();
        } else {
            Set<String> groupIds = securityUtils.getCurrentGroupIds();
            if (groupIds.isEmpty()) {
                return List.of();
            }
            return groupMapper.findByGroupIdIn(groupIds);
        }
    }

    @Transactional(readOnly = true)
    public JobGroupVO getGroup(String groupId) {
        return groupMapper.findById(groupId);
    }

    @Transactional
    public JobGroupVO createGroup(GroupRequest request) {
        if (groupMapper.existsByGroupName(request.getGroupName())) {
            throw new IllegalArgumentException("Group name already exists: " + request.getGroupName());
        }

        long now = System.currentTimeMillis();
        String currentUserId = securityUtils.getCurrentId();

        JobGroupVO group = JobGroupVO.builder()
                .groupId(UUID.randomUUID().toString())
                .groupName(request.getGroupName())
                .groupComments(request.getGroupComments())
                .frstRegDate(now)
                .lastChgDate(now)
                .frstRegUserId(currentUserId)
                .lastRegUserId(currentUserId)
                .build();

        groupMapper.insert(group);
        return group;
    }

    @Transactional
    public JobGroupVO updateGroup(GroupRequest request) {
        JobGroupVO existing = groupMapper.findById(request.getGroupId());
        if (existing == null) {
            throw new IllegalArgumentException("Group not found: " + request.getGroupId());
        }

        // Check for duplicate name
        JobGroupVO byName = groupMapper.findByGroupName(request.getGroupName());
        if (byName != null && !byName.getGroupId().equals(request.getGroupId())) {
            throw new IllegalArgumentException("Group name already exists: " + request.getGroupName());
        }

        existing.setGroupName(request.getGroupName());
        existing.setGroupComments(request.getGroupComments());
        existing.setLastChgDate(System.currentTimeMillis());
        existing.setLastRegUserId(securityUtils.getCurrentId());

        groupMapper.update(existing);
        return existing;
    }

    @Transactional
    public void deleteGroup(String groupId) {
        JobGroupVO existing = groupMapper.findById(groupId);
        if (existing == null) {
            throw new IllegalArgumentException("Group not found: " + groupId);
        }

        // Check for related jobs
        long jobCount = jobMapper.countByGroupId(groupId);
        if (jobCount > 0) {
            throw new IllegalArgumentException("Cannot delete group: " + jobCount + " job(s) are associated with this group");
        }

        // Check for related users
        long userCount = userMapper.countUsersByGroupId(groupId);
        if (userCount > 0) {
            throw new IllegalArgumentException("Cannot delete group: " + userCount + " user(s) are associated with this group");
        }

        groupMapper.delete(groupId);
    }
}
