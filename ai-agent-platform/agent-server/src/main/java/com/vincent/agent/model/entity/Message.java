package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "message", autoResultMap = true)
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long conversationId;
    private String role;
    private String content;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object toolCallsJson;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
