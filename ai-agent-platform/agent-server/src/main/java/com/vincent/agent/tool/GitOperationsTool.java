package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.stream.Collectors;

@Component
public class GitOperationsTool {

    @Tool(description = "Execute git operations on a repository. Supports: log, diff, blame, status, branch actions.")
    public String gitOperation(
            @ToolParam(description = "Git action: log, diff, blame, status, branch") String action,
            @ToolParam(description = "Path to the git repository") String repoPath,
            @ToolParam(description = "Additional arguments (e.g., file path for blame, number of commits for log)") String args) {
        try {
            String command = switch (action.toLowerCase()) {
                case "log" -> "git log --oneline -" + (args != null && !args.isEmpty() ? args : "10");
                case "diff" -> "git diff" + (args != null && !args.isEmpty() ? " " + args : "");
                case "blame" -> "git blame " + (args != null ? args : "");
                case "status" -> "git status --short";
                case "branch" -> "git branch" + (args != null && !args.isEmpty() ? " " + args : "");
                default -> throw new IllegalArgumentException("Unknown action: " + action);
            };

            ProcessBuilder pb = new ProcessBuilder("sh", "-c", command);
            pb.directory(Path.of(repoPath).toFile());
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String output;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                return "Git command failed (exit " + exitCode + "): " + output;
            }
            return output.isEmpty() ? "No output" : output;
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }
}
