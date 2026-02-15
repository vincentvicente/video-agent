package com.vincent.agent.agent;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class AgentContext {
    private Long conversationId;
    private String userQuery;
    private List<ReActStep> steps = new ArrayList<>();
    private String finalAnswer;
    private int maxIterations = 5;
    private int currentIteration = 0;
}
