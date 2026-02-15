package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Document;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DocumentMapper extends BaseMapper<Document> {
}
