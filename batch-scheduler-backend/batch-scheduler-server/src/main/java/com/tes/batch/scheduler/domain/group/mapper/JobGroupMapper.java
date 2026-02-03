package com.tes.batch.scheduler.domain.group.mapper;

import com.tes.batch.scheduler.domain.group.vo.JobGroupVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

@Mapper
public interface JobGroupMapper {

    JobGroupVO findById(@Param("groupId") String groupId);

    JobGroupVO findByGroupName(@Param("groupName") String groupName);

    boolean existsByGroupName(@Param("groupName") String groupName);

    List<JobGroupVO> findAll();

    List<JobGroupVO> findByGroupIdIn(@Param("groupIds") Set<String> groupIds);

    List<JobGroupVO> findByFilters(
            @Param("textSearch") String textSearch,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByFilters(@Param("textSearch") String textSearch);

    List<JobGroupVO> findByGroupIdInWithPaging(
            @Param("groupIds") Set<String> groupIds,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    long countByGroupIdIn(@Param("groupIds") Set<String> groupIds);

    int insert(JobGroupVO group);

    int update(JobGroupVO group);

    int delete(@Param("groupId") String groupId);
}
