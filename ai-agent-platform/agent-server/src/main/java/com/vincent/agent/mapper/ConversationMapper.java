package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Conversation;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {
}
