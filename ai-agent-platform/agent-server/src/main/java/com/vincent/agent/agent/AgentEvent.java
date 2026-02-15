package com.vincent.agent.agent;

import lombok.Data;
import java.util.Map;

@Data
public class AgentEvent {
    private String type; // token, tool_start, tool_end, react_step, source, done, error
    private Object data;

    public static AgentEvent token(String content) {
        AgentEvent e = new AgentEvent();
        e.setType("token");
        e.setData(content);
        return e;
    }

    public static AgentEvent toolStart(String toolName, Object input) {
        AgentEvent e = new AgentEvent();
        e.setType("tool_start");
        e.setData(Map.of("tool", toolName, "input", input));
        return e;
    }

    public static AgentEvent toolEnd(String toolName, Object output) {
        AgentEvent e = new AgentEvent();
        e.setType("tool_end");
        e.setData(Map.of("tool", toolName, "output", output));
        return e;
    }

    public static AgentEvent reactStep(String step, String content) {
        AgentEvent e = new AgentEvent();
        e.setType("react_step");
        e.setData(Map.of("step", step, "content", content));
        return e;
    }

    public static AgentEvent done() {
        AgentEvent e = new AgentEvent();
        e.setType("done");
        e.setData(Map.of());
        return e;
    }

    public static AgentEvent error(String message) {
        AgentEvent e = new AgentEvent();
        e.setType("error");
        e.setData(Map.of("message", message));
        return e;
    }
}
