package com.vincent.agent.tool;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CodeReviewTool {

    private final ChatModel chatModel;

    @Tool(description = "Perform an automated code review on the provided code or diff. Returns review comments with severity levels and suggestions.")
    public String reviewCode(
            @ToolParam(description = "The source code or diff content to review") String codeContent,
            @ToolParam(description = "Programming language of the code") String language) {
        try {
            String promptText = String.format("""
                    You are a senior code reviewer. Review the following %s code and provide:
                    1. Issues found (with severity: critical/warning/info)
                    2. Security concerns
                    3. Performance suggestions
                    4. Best practice recommendations

                    Code:
                    ```%s
                    %s
                    ```
                    """, language, language, codeContent);

            var response = chatModel.call(new Prompt(promptText));
            return response.getResult().getOutput().getText();
        } catch (Exception e) {
            return "Error performing code review: " + e.getMessage();
        }
    }
}
