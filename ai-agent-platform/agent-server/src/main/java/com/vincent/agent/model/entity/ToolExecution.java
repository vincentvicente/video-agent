package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "tool_execution", autoResultMap = true)
public class ToolExecution {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long messageId;
    private String toolName;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object inputJson;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object outputJson;
    private Integer durationMs;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
