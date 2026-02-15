package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class LogAnalyzerTool {

    @Tool(description = "Analyze log files by searching for patterns. Returns matching lines and statistics.")
    public String analyzeLogs(
            @ToolParam(description = "Path to the log file") String logPath,
            @ToolParam(description = "Regex pattern to search for") String pattern,
            @ToolParam(description = "Maximum number of matching lines to return") int maxLines) {
        try {
            Path path = Path.of(logPath);
            if (!Files.exists(path)) {
                return "Error: File not found: " + logPath;
            }

            Pattern regex = Pattern.compile(pattern);
            List<String> allLines = Files.readAllLines(path);
            List<String> matches = allLines.stream()
                    .filter(line -> regex.matcher(line).find())
                    .limit(maxLines > 0 ? maxLines : 50)
                    .collect(Collectors.toList());

            StringBuilder sb = new StringBuilder();
            sb.append("File: ").append(logPath).append("\n");
            sb.append("Total lines: ").append(allLines.size()).append("\n");
            sb.append("Matches found: ").append(matches.size()).append("\n\n");
            for (String match : matches) {
                sb.append(match).append("\n");
            }
            return sb.toString();
        } catch (IOException e) {
            return "Error reading log file: " + e.getMessage();
        }
    }
}
