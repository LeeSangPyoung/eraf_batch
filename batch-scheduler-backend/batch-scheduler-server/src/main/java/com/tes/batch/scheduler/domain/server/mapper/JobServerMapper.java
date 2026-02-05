package com.tes.batch.scheduler.domain.server.mapper;

import com.tes.batch.scheduler.domain.server.vo.JobServerVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface JobServerMapper {

    JobServerVO findById(@Param("systemId") String systemId);

    JobServerVO findBySystemName(@Param("systemName") String systemName);

    JobServerVO findByQueueName(@Param("queueName") String queueName);

    boolean existsBySystemName(@Param("systemName") String systemName);

    JobServerVO findByHostAndPort(
            @Param("hostIpAddr") String hostIpAddr,
            @Param("agentPort") Integer agentPort
    );

    List<JobServerVO> findAll();

    List<JobServerVO> findByFilters(
            @Param("textSearch") String textSearch,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(@Param("textSearch") String textSearch);

    List<JobServerVO> findByAgentStatus(@Param("status") String status);

    int insert(JobServerVO server);

    int update(JobServerVO server);

    int updateAgentStatus(
            @Param("systemId") String systemId,
            @Param("agentStatus") String agentStatus
    );

    int updateHealthStatus(
            @Param("systemId") String systemId,
            @Param("isHealthy") Boolean isHealthy
    );

    int delete(@Param("systemId") String systemId);
}
