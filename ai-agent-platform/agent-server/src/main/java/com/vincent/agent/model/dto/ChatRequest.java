package com.vincent.agent.model.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private Long conversationId;
    private String message;
}
