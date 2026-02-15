package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Component
public class CiCdTriggerTool {

    @Tool(description = "Trigger a CI/CD pipeline build. Returns build status and ID. (Currently simulated)")
    public Map<String, Object> triggerPipeline(
            @ToolParam(description = "Pipeline name or ID") String pipeline,
            @ToolParam(description = "Branch to build") String branch,
            @ToolParam(description = "Additional parameters as key=value pairs") String params) {
        // Simulated CI/CD trigger
        String buildId = UUID.randomUUID().toString().substring(0, 8);
        return Map.of(
                "buildId", buildId,
                "pipeline", pipeline,
                "branch", branch,
                "status", "TRIGGERED",
                "message", "Build " + buildId + " triggered for " + pipeline + " on branch " + branch,
                "triggeredAt", LocalDateTime.now().toString(),
                "estimatedDuration", "~3 minutes"
        );
    }
}
