package com.vincent.agent.agent;

import lombok.Data;

@Data
public class ReActStep {
    public enum Type { THINK, ACT, OBSERVE }

    private Type type;
    private String content;
    private String toolName;
    private Object toolInput;
    private Object toolOutput;
    private long durationMs;
}
