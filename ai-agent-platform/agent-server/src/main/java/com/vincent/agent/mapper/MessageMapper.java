package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Message;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
}
