package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class WebSearchTool {

    @Tool(description = "Search the internet for information. Returns a list of relevant search results with titles, URLs, and snippets.")
    public List<Map<String, String>> webSearch(
            @ToolParam(description = "The search query") String query,
            @ToolParam(description = "Maximum number of results to return (default 5)") int maxResults) {
        // TODO: Integrate with real search API (SerpAPI, Tavily, etc.)
        return List.of(
                Map.of("title", "Search result for: " + query,
                       "url", "https://example.com",
                       "snippet", "This is a placeholder search result. Integrate with a real search API.")
        );
    }
}
