package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class FileManagerTool {

    private static final Path BASE_DIR = Path.of(System.getProperty("user.dir"), "workspace");

    @Tool(description = "Read, write, or list files in the workspace directory.")
    public String fileOperation(
            @ToolParam(description = "Action to perform: read, write, or list") String action,
            @ToolParam(description = "Relative file path within workspace") String path,
            @ToolParam(description = "Content to write (only for write action)") String content) {
        try {
            Path targetPath = BASE_DIR.resolve(path).normalize();
            if (!targetPath.startsWith(BASE_DIR)) {
                return "Error: Path traversal not allowed";
            }

            return switch (action.toLowerCase()) {
                case "read" -> Files.readString(targetPath);
                case "write" -> {
                    Files.createDirectories(targetPath.getParent());
                    Files.writeString(targetPath, content);
                    yield "File written successfully: " + path;
                }
                case "list" -> {
                    if (!Files.isDirectory(targetPath)) {
                        yield "Error: Not a directory";
                    }
                    try (Stream<Path> paths = Files.list(targetPath)) {
                        yield paths.map(p -> p.getFileName().toString())
                                .collect(Collectors.joining("\n"));
                    }
                }
                default -> "Error: Unknown action. Use read, write, or list.";
            };
        } catch (IOException e) {
            return "Error: " + e.getMessage();
        }
    }
}
