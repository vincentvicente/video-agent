package com.vincent.agent.tool;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DocGeneratorTool {

    private final ChatModel chatModel;

    @Tool(description = "Generate documentation for source code. Returns markdown-formatted documentation including description, parameters, return values, and usage examples.")
    public String generateDoc(
            @ToolParam(description = "Type of documentation: api, readme, javadoc, changelog") String type,
            @ToolParam(description = "The source code or description to document") String sourceCode) {
        try {
            String promptText = String.format("""
                    Generate %s documentation in Markdown format for the following code:

                    ```
                    %s
                    ```

                    Include: description, parameters, return values, and usage examples where applicable.
                    """, type, sourceCode);

            var response = chatModel.call(new Prompt(promptText));
            return response.getResult().getOutput().getText();
        } catch (Exception e) {
            return "Error generating documentation: " + e.getMessage();
        }
    }
}
