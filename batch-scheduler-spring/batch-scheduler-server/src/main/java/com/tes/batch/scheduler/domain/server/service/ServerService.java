package com.tes.batch.scheduler.domain.server.service;

import com.tes.batch.scheduler.domain.server.dto.ServerFilterRequest;
import com.tes.batch.scheduler.domain.server.dto.ServerRequest;
import com.tes.batch.scheduler.domain.server.mapper.JobServerMapper;
import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import com.tes.batch.scheduler.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServerService {

    private final JobServerMapper serverMapper;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public List<JobServerVO> getServers(ServerFilterRequest request) {
        int offset = request.getPage() * request.getSize();
        return serverMapper.findByFilters(request.getTextSearch(), request.getSize(), offset);
    }

    @Transactional(readOnly = true)
    public long countServers(ServerFilterRequest request) {
        return serverMapper.countByFilters(request.getTextSearch());
    }

    @Transactional(readOnly = true)
    public List<JobServerVO> getAllServers() {
        return serverMapper.findAll();
    }

    @Transactional(readOnly = true)
    public JobServerVO getServer(String systemId) {
        return serverMapper.findById(systemId);
    }

    @Transactional
    public JobServerVO createServer(ServerRequest request) {
        if (serverMapper.existsBySystemName(request.getSystemName())) {
            throw new IllegalArgumentException("System name already exists: " + request.getSystemName());
        }

        long now = System.currentTimeMillis();
        String currentUserId = securityUtils.getCurrentId();
        String systemId = UUID.randomUUID().toString();

        JobServerVO server = JobServerVO.builder()
                .systemId(systemId)
                .systemName(request.getSystemName())
                .hostName(request.getHostName())
                .hostIpAddr(request.getHostIpAddr())
                .secondaryHostIpAddr(request.getSecondaryHostIpAddr())
                .systemComments(request.getSystemComments())
                .queueName(systemId.replace("-", ""))
                .folderPath(request.getFolderPath())
                .secondaryFolderPath(request.getSecondaryFolderPath())
                .sshUser(request.getSshUser())
                .agentStatus("UNKNOWN")
                .frstRegDate(now)
                .lastChgDate(now)
                .frstRegUserId(currentUserId)
                .lastRegUserId(currentUserId)
                .build();

        serverMapper.insert(server);
        return server;
    }

    @Transactional
    public JobServerVO updateServer(ServerRequest request) {
        JobServerVO existing = serverMapper.findById(request.getSystemId());
        if (existing == null) {
            throw new IllegalArgumentException("Server not found: " + request.getSystemId());
        }

        // Check for duplicate name
        JobServerVO byName = serverMapper.findBySystemName(request.getSystemName());
        if (byName != null && !byName.getSystemId().equals(request.getSystemId())) {
            throw new IllegalArgumentException("System name already exists: " + request.getSystemName());
        }

        existing.setSystemName(request.getSystemName());
        existing.setHostName(request.getHostName());
        existing.setHostIpAddr(request.getHostIpAddr());
        existing.setSecondaryHostIpAddr(request.getSecondaryHostIpAddr());
        existing.setSystemComments(request.getSystemComments());
        existing.setFolderPath(request.getFolderPath());
        existing.setSecondaryFolderPath(request.getSecondaryFolderPath());
        existing.setSshUser(request.getSshUser());
        existing.setLastChgDate(System.currentTimeMillis());
        existing.setLastRegUserId(securityUtils.getCurrentId());

        serverMapper.update(existing);
        return existing;
    }

    @Transactional
    public void deleteServer(String systemId) {
        JobServerVO existing = serverMapper.findById(systemId);
        if (existing == null) {
            throw new IllegalArgumentException("Server not found: " + systemId);
        }
        serverMapper.delete(systemId);
    }

    @Transactional
    public void updateAgentStatus(String systemId, String status) {
        serverMapper.updateAgentStatus(systemId, status);
    }
}
