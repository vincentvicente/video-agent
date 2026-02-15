package com.vincent.agent.tool;

import com.vincent.agent.rag.RetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class RagSearchTool {

    private final RetrievalService retrievalService;

    @Tool(description = "Search the knowledge base for relevant information. Returns the most relevant text chunks from uploaded documents.")
    public String searchKnowledgeBase(
            @ToolParam(description = "The search query") String query,
            @ToolParam(description = "Number of results to return (default 5)") int topK) {
        try {
            List<String> results = retrievalService.retrieve(query, topK > 0 ? topK : 5);
            if (results.isEmpty()) {
                return "No relevant results found in the knowledge base.";
            }
            StringBuilder sb = new StringBuilder("Knowledge Base Results:\n\n");
            for (int i = 0; i < results.size(); i++) {
                sb.append("[").append(i + 1).append("] ").append(results.get(i)).append("\n\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Search error: " + e.getMessage();
        }
    }
}
