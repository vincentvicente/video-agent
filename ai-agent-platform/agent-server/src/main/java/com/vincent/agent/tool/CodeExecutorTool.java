package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class CodeExecutorTool {

    private static final int TIMEOUT_SECONDS = 30;

    @Tool(description = "Execute a code snippet in the specified programming language. Supports: python, javascript, java, bash. Returns stdout and stderr.")
    public String executeCode(
            @ToolParam(description = "Programming language: python, javascript, java, bash") String language,
            @ToolParam(description = "The code to execute") String code) {
        try {
            Path tempFile = createTempFile(language, code);

            String[] command = switch (language.toLowerCase()) {
                case "python" -> new String[]{"python3", tempFile.toString()};
                case "javascript", "js" -> new String[]{"node", tempFile.toString()};
                case "bash", "sh" -> new String[]{"bash", tempFile.toString()};
                default -> throw new IllegalArgumentException("Unsupported language: " + language);
            };

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            String output;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            Files.deleteIfExists(tempFile);

            if (!finished) {
                process.destroyForcibly();
                return "Error: Code execution timed out after " + TIMEOUT_SECONDS + " seconds";
            }

            int exitCode = process.exitValue();
            return String.format("Exit code: %d\nOutput:\n%s", exitCode, output);
        } catch (Exception e) {
            return "Execution error: " + e.getMessage();
        }
    }

    private Path createTempFile(String language, String code) throws Exception {
        String extension = switch (language.toLowerCase()) {
            case "python" -> ".py";
            case "javascript", "js" -> ".js";
            case "bash", "sh" -> ".sh";
            default -> ".txt";
        };
        Path tempFile = Files.createTempFile("code_exec_", extension);
        Files.writeString(tempFile, code);
        return tempFile;
    }
}
